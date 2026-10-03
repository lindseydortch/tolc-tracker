import { and, asc, eq, inArray, isNotNull, sql, type SQL } from 'drizzle-orm'
import type { Db } from '../db/client'
import {
  links,
  memberSeniorities,
  memberSkills,
  memberTargetRoles,
  members,
  skillAliases,
  skills,
  targetRoleAliases,
  targetRoles,
} from '../db/schema'
import {
  DiscordUnavailableError,
  type MembershipChecker,
} from './membership-checker'
import { normalizeName } from './normalize-name'
import {
  checkProfile,
  sortSeniorities,
  type Catalogs,
  type ProfileForm,
  type ProfileProblems,
} from './profile'

export {
  profileProblems,
  skillsForLayer,
  type ProfileForm,
  type ProfileProblems,
} from './profile'

export type StackLayer = (typeof skills.$inferSelect)['suggestedLayer'] & {}

export type JobSearchStatus = (typeof members.$inferSelect)['jobSearchStatus'] & {}

export type Seniority = (typeof memberSeniorities.$inferSelect)['seniority']

export type SkillSeed = {
  name: string
  suggestedLayer?: StackLayer
  aliases: string[]
}

export type TargetRoleSeed = {
  name: string
  aliases: string[]
}

export type CatalogSeed = {
  skills: SkillSeed[]
  roles: TargetRoleSeed[]
}

export type CatalogSkill = {
  name: string
  suggestedLayer: StackLayer | null
  aliases: string[]
}

export type CatalogTargetRole = {
  name: string
  aliases: string[]
}

export type LinkKind = (typeof links.$inferSelect)['kind']

export type MemberLink = {
  kind: LinkKind
  url: string
  label: string | null
}

export type Member = {
  id: number
  // True for a Hidden Member.
  hidden: boolean
  links: MemberLink[]
}

export type DiscordConnection = {
  userId: string
  handle: string
}

export type SignedInMember = {
  id: number
  githubUrl: string
  discord: DiscordConnection | null
  // Null until Discord is first connected.
  discordSyncedAt: Date | null
}

// A complete, non-hidden Member as the Directory lists them.
export type DirectoryEntry = {
  id: number
  firstName: string
  lastName: string
  discordHandle: string
  jobSearchStatus: JobSearchStatus
  targetRoles: string[]
  preferredSeniority: Seniority
  otherSeniorities: Seniority[]
  preferredStack: Partial<Record<StackLayer, string>>
}

export type CompleteProfileResult =
  | { ok: true }
  | { ok: false; problems: ProfileProblems }

// 'unknown': no Discord connected yet, or no answer from Discord to trust.
export type Membership = 'in-tolc' | 'not-in-tolc' | 'unknown'

// How long an answer lasts within one session (ADR 0001).
const membershipCheckLifetimeMs = 24 * 60 * 60 * 1000
// Discord rate-limits each user's token, so never ask more often than this.
const membershipRetryMs = 30 * 1000

// `membershipChecker` is only needed by `refreshMembership`.
export function createDirectory(
  db: Db,
  { membershipChecker }: { membershipChecker?: MembershipChecker } = {},
) {
  // Members with every required profile field filled, matching `where`.
  // A profile is complete only once the signup form has been sent and
  // Discord is connected, so a half-saved Member never shows up.
  async function completeProfiles(where: SQL | undefined): Promise<DirectoryEntry[]> {
    const rows = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        discordHandle: members.discordHandle,
        jobSearchStatus: members.jobSearchStatus,
      })
      .from(members)
      .innerJoin(
        links,
        and(eq(links.memberId, members.id), eq(links.kind, 'linkedin')),
      )
      .where(
        and(
          where,
          isNotNull(members.firstName),
          isNotNull(members.lastName),
          isNotNull(members.discordHandle),
          isNotNull(members.jobSearchStatus),
        ),
      )
      .orderBy(asc(members.firstName), asc(members.lastName), asc(members.id))
    if (rows.length === 0) return []
    const ids = rows.map((row) => row.id)
    const roles = await db
      .select({ memberId: memberTargetRoles.memberId, name: targetRoles.name })
      .from(memberTargetRoles)
      .innerJoin(targetRoles, eq(memberTargetRoles.targetRoleId, targetRoles.id))
      .where(inArray(memberTargetRoles.memberId, ids))
      .orderBy(asc(targetRoles.name))
    const seniorities = await db
      .select()
      .from(memberSeniorities)
      .where(inArray(memberSeniorities.memberId, ids))
    const primarySkills = await db
      .select({
        memberId: memberSkills.memberId,
        layer: memberSkills.stackLayer,
        name: skills.name,
      })
      .from(memberSkills)
      .innerJoin(skills, eq(memberSkills.skillId, skills.id))
      .where(
        and(
          inArray(memberSkills.memberId, ids),
          isNotNull(memberSkills.stackLayer),
        ),
      )

    const entries: DirectoryEntry[] = []
    for (const row of rows) {
      const { firstName, lastName, discordHandle, jobSearchStatus } = row
      const own = <T extends { memberId: number }>(all: T[]) =>
        all.filter((item) => item.memberId === row.id)
      const preferred = own(seniorities).find((s) => s.preferred)
      const preferredStack: DirectoryEntry['preferredStack'] = {}
      for (const skill of own(primarySkills)) {
        if (skill.layer) preferredStack[skill.layer] = skill.name
      }
      const targetRoleNames = own(roles).map((role) => role.name)
      if (
        !firstName ||
        !lastName ||
        !discordHandle ||
        !jobSearchStatus ||
        !preferred ||
        targetRoleNames.length === 0 ||
        Object.keys(preferredStack).length === 0
      ) {
        continue
      }
      entries.push({
        id: row.id,
        firstName,
        lastName,
        discordHandle,
        jobSearchStatus,
        targetRoles: targetRoleNames,
        preferredSeniority: preferred.seniority,
        otherSeniorities: sortSeniorities(
          own(seniorities)
            .filter((s) => !s.preferred)
            .map((s) => s.seniority),
        ),
        preferredStack,
      })
    }
    return entries
  }

  const directory = {
    // Called on every signed-in page load. Creates the Member on first use
    // and keeps the GitHub Link in step with renames, writing only on change.
    // Returns null without a GitHub username, so the visitor is treated as
    // signed out and can sign in again to repair it.
    async signIn({
      authUserId,
      githubUsername,
    }: {
      authUserId: string
      githubUsername: string | null
    }): Promise<SignedInMember | null> {
      if (!githubUsername) return null
      const githubUrl = `https://github.com/${githubUsername}`
      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select({
            id: members.id,
            discordUserId: members.discordUserId,
            discordHandle: members.discordHandle,
            discordSyncedAt: members.discordSyncedAt,
            githubUrl: links.url,
            linkId: links.id,
          })
          .from(members)
          .leftJoin(
            links,
            and(eq(links.memberId, members.id), eq(links.kind, 'github')),
          )
          .where(eq(members.authUserId, authUserId))

        const memberId =
          existing?.id ??
          (
            await tx
              .insert(members)
              .values({ authUserId })
              .returning({ id: members.id })
          )[0].id

        if (!existing?.linkId) {
          await tx
            .insert(links)
            .values({ memberId, kind: 'github', url: githubUrl })
        } else if (existing.githubUrl !== githubUrl) {
          await tx
            .update(links)
            .set({ url: githubUrl })
            .where(eq(links.id, existing.linkId))
        }
        const discord =
          existing?.discordUserId && existing.discordHandle
            ? { userId: existing.discordUserId, handle: existing.discordHandle }
            : null
        return {
          id: memberId,
          githubUrl,
          discord,
          discordSyncedAt: existing?.discordSyncedAt ?? null,
        }
      })
    },

    // Called when the Member links Discord and again after each sign-in, so
    // the handle follows Discord renames. The Discord user ID never changes.
    async connectDiscord({
      authUserId,
      discord,
    }: {
      authUserId: string
      discord: DiscordConnection
    }): Promise<void> {
      const updated = await db
        .update(members)
        .set({
          discordUserId: discord.userId,
          discordHandle: discord.handle,
          discordSyncedAt: new Date(),
          // A different Discord account must pass the membership check anew.
          membershipCheckedAt: sql`
            case when ${members.discordUserId} = ${discord.userId}
              then ${members.membershipCheckedAt}
            end`,
          // A fresh link is worth asking about right away.
          membershipAttemptedAt: null,
        })
        .where(eq(members.authUserId, authUserId))
        .returning({ id: members.id })
      if (updated.length === 0) {
        throw new Error(`No Member for auth user "${authUserId}"`)
      }
    },

    // Asks Discord whether the Member is still in TOLC, once per sign-in and
    // once a day, hiding them when they've left and unhiding them when they
    // rejoin. A Hidden Member is asked on every call (at most twice a
    // minute), so joining TOLC soon lets them in. While Discord is
    // unavailable the last answer stands; once it refuses, the answer is
    // dropped and the Member hidden until it answers again.
    async refreshMembership({
      authUserId,
      sessionStartedAt,
      now = new Date(),
    }: {
      authUserId: string
      sessionStartedAt: Date
      now?: Date
    }): Promise<Membership> {
      const [member] = await db
        .select({
          discordUserId: members.discordUserId,
          hidden: members.hidden,
          checkedAt: members.membershipCheckedAt,
          attemptedAt: members.membershipAttemptedAt,
        })
        .from(members)
        .where(eq(members.authUserId, authUserId))
      if (!member?.discordUserId) return 'unknown'
      const { discordUserId } = member
      let { hidden, checkedAt } = member

      if (isMembershipCheckDue({ ...member, sessionStartedAt, now })) {
        if (!membershipChecker) {
          throw new Error('This Directory has no membership checker')
        }
        try {
          hidden = !(await membershipChecker.isInTolc({
            authUserId,
            discordUserId,
          }))
          checkedAt = now
        } catch (error) {
          console.error('Could not check TOLC membership', error)
          if (!(error instanceof DiscordUnavailableError)) {
            checkedAt = null
            hidden = true
          }
        }
        await db
          .update(members)
          .set({
            hidden,
            membershipCheckedAt: checkedAt,
            membershipAttemptedAt: now,
          })
          .where(
            and(
              eq(members.authUserId, authUserId),
              // Skip if a different Discord account was connected meanwhile.
              eq(members.discordUserId, discordUserId),
            ),
          )
      }
      if (!checkedAt) return 'unknown'
      return hidden ? 'not-in-tolc' : 'in-tolc'
    },

    // Saves the signup form, or returns what blocks it. Sending it again
    // replaces the profile; Skills dropped from the Preferred Stack stay on
    // as Secondary Skills.
    async completeProfile({
      authUserId,
      form,
    }: {
      authUserId: string
      form: ProfileForm
    }): Promise<CompleteProfileResult> {
      const [member] = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.authUserId, authUserId))
      if (!member) throw new Error(`No Member for auth user "${authUserId}"`)
      const check = checkProfile(form, await directory.catalogs())
      if (!check.ok) return check
      const { profile } = check
      const memberId = member.id

      await db.transaction(async (tx) => {
        await tx
          .update(members)
          .set({
            firstName: profile.firstName,
            lastName: profile.lastName,
            jobSearchStatus: profile.jobSearchStatus,
          })
          .where(eq(members.id, memberId))

        await tx
          .delete(links)
          .where(and(eq(links.memberId, memberId), eq(links.kind, 'linkedin')))
        await tx
          .insert(links)
          .values({ memberId, kind: 'linkedin', url: profile.linkedinUrl })

        const roleIds = await tx
          .select({ id: targetRoles.id })
          .from(targetRoles)
          .where(inArray(targetRoles.normalizedName, profile.targetRoles.map(normalizeName)))
        await tx.delete(memberTargetRoles).where(eq(memberTargetRoles.memberId, memberId))
        await tx
          .insert(memberTargetRoles)
          .values(roleIds.map(({ id }) => ({ memberId, targetRoleId: id })))

        await tx.delete(memberSeniorities).where(eq(memberSeniorities.memberId, memberId))
        await tx.insert(memberSeniorities).values([
          { memberId, seniority: profile.preferredSeniority, preferred: true },
          ...profile.otherSeniorities.map((seniority) => ({
            memberId,
            seniority,
            preferred: false,
          })),
        ])

        await tx
          .update(memberSkills)
          .set({ stackLayer: null })
          .where(eq(memberSkills.memberId, memberId))
        const stack = Object.entries(profile.preferredStack) as [StackLayer, string][]
        const skillIds = await tx
          .select({ id: skills.id, name: skills.name })
          .from(skills)
          .where(
            inArray(
              skills.normalizedName,
              stack.map(([, name]) => normalizeName(name)),
            ),
          )
        for (const [stackLayer, name] of stack) {
          const skill = skillIds.find((row) => row.name === name)
          if (!skill) throw new Error(`Skill "${name}" vanished from the Catalog`)
          await tx
            .insert(memberSkills)
            .values({ memberId, skillId: skill.id, stackLayer })
            .onConflictDoUpdate({
              target: [memberSkills.memberId, memberSkills.skillId],
              set: { stackLayer },
            })
        }
      })
      return { ok: true }
    },

    async isProfileComplete(authUserId: string): Promise<boolean> {
      const found = await completeProfiles(eq(members.authUserId, authUserId))
      return found.length > 0
    },

    // Every complete, non-hidden Member, whatever their Job Search Status.
    async listDirectory(): Promise<DirectoryEntry[]> {
      return completeProfiles(eq(members.hidden, false))
    },

    async memberForAuthUser(authUserId: string): Promise<Member | null> {
      const [member] = await db
        .select({ id: members.id, hidden: members.hidden })
        .from(members)
        .where(eq(members.authUserId, authUserId))
      if (!member) return null
      const memberLinks = await db
        .select({ kind: links.kind, url: links.url, label: links.label })
        .from(links)
        .where(eq(links.memberId, member.id))
        .orderBy(asc(links.id))
      return { ...member, links: memberLinks }
    },

    // Safe to run repeatedly: an entry already present by name or Alias is
    // left untouched, so Member-added entries and Admin merges survive.
    async seedCatalogs(seed: CatalogSeed): Promise<void> {
      await db.transaction(async (tx) => {
        await seedCatalog(seed.skills, {
          existing: async () => [
            ...(await tx
              .select({ id: skills.id, name: skills.name, normalizedName: skills.normalizedName })
              .from(skills)),
            ...(await tx
              .select({ id: skills.id, name: skills.name, normalizedName: skillAliases.normalizedName })
              .from(skillAliases)
              .innerJoin(skills, eq(skillAliases.skillId, skills.id))),
          ],
          insertEntry: async (skill) => {
            const [row] = await tx
              .insert(skills)
              .values({
                name: skill.name,
                normalizedName: normalizeName(skill.name),
                suggestedLayer: skill.suggestedLayer ?? null,
              })
              .returning({ id: skills.id })
            return row.id
          },
          insertAlias: async (skillId, alias) => {
            await tx
              .insert(skillAliases)
              .values({ skillId, name: alias, normalizedName: normalizeName(alias) })
          },
        })

        await seedCatalog(seed.roles, {
          existing: async () => [
            ...(await tx
              .select({ id: targetRoles.id, name: targetRoles.name, normalizedName: targetRoles.normalizedName })
              .from(targetRoles)),
            ...(await tx
              .select({ id: targetRoles.id, name: targetRoles.name, normalizedName: targetRoleAliases.normalizedName })
              .from(targetRoleAliases)
              .innerJoin(targetRoles, eq(targetRoleAliases.targetRoleId, targetRoles.id))),
          ],
          insertEntry: async (role) => {
            const [row] = await tx
              .insert(targetRoles)
              .values({ name: role.name, normalizedName: normalizeName(role.name) })
              .returning({ id: targetRoles.id })
            return row.id
          },
          insertAlias: async (targetRoleId, alias) => {
            await tx
              .insert(targetRoleAliases)
              .values({ targetRoleId, name: alias, normalizedName: normalizeName(alias) })
          },
        })
      })
    },

    async skillCatalog(): Promise<CatalogSkill[]> {
      const rows = await db.select().from(skills).orderBy(asc(skills.name))
      const aliases = await db
        .select()
        .from(skillAliases)
        .orderBy(asc(skillAliases.id))
      return rows.map((skill) => ({
        name: skill.name,
        suggestedLayer: skill.suggestedLayer,
        aliases: aliases
          .filter((alias) => alias.skillId === skill.id)
          .map((alias) => alias.name),
      }))
    },

    async catalogs(): Promise<Catalogs> {
      return {
        skills: await directory.skillCatalog(),
        roles: await directory.roleCatalog(),
      }
    },

    async roleCatalog(): Promise<CatalogTargetRole[]> {
      const rows = await db
        .select()
        .from(targetRoles)
        .orderBy(asc(targetRoles.name))
      const aliases = await db
        .select()
        .from(targetRoleAliases)
        .orderBy(asc(targetRoleAliases.id))
      return rows.map((role) => ({
        name: role.name,
        aliases: aliases
          .filter((alias) => alias.targetRoleId === role.id)
          .map((alias) => alias.name),
      }))
    },
  }
  return directory
}

export type Directory = ReturnType<typeof createDirectory>

// Discord is synced once per sign-in, and again after the Member connects
// Discord in the middle of a session (which doesn't start a new one).
export function isDiscordSyncDue({
  syncedAt,
  sessionStartedAt,
  linkedAt,
}: {
  syncedAt: Date | null
  sessionStartedAt: Date
  // When the linked Discord account was last connected or refreshed.
  linkedAt: Date
}): boolean {
  return !syncedAt || syncedAt < sessionStartedAt || syncedAt < linkedAt
}

function isMembershipCheckDue({
  hidden,
  checkedAt,
  attemptedAt,
  sessionStartedAt,
  now,
}: {
  hidden: boolean
  checkedAt: Date | null
  attemptedAt: Date | null
  sessionStartedAt: Date
  now: Date
}): boolean {
  if (attemptedAt && now.getTime() - attemptedAt.getTime() < membershipRetryMs) {
    return false
  }
  return (
    !checkedAt ||
    hidden ||
    checkedAt < sessionStartedAt ||
    now.getTime() - checkedAt.getTime() >= membershipCheckLifetimeMs
  )
}

type CatalogEntryRef = { id: number; name: string }

// Shared by both Catalogs: every normalized name (canonical or Alias) points
// at exactly one entry, so seed names resolve the way Members' typing will.
async function seedCatalog<Entry extends { name: string; aliases: string[] }>(
  entries: Entry[],
  store: {
    existing: () => Promise<(CatalogEntryRef & { normalizedName: string })[]>
    insertEntry: (entry: Entry) => Promise<number>
    insertAlias: (entryId: number, alias: string) => Promise<void>
  },
): Promise<void> {
  const owners = new Map<string, CatalogEntryRef>()
  for (const { normalizedName, ...owner } of await store.existing()) {
    owners.set(normalizedName, owner)
  }

  for (const entry of entries) {
    let owner = owners.get(normalizeName(entry.name))
    if (!owner) {
      owner = { id: await store.insertEntry(entry), name: entry.name }
      owners.set(normalizeName(entry.name), owner)
    }
    for (const alias of entry.aliases) {
      const aliasOwner = owners.get(normalizeName(alias))
      if (aliasOwner?.id === owner.id) continue
      if (aliasOwner) {
        throw new Error(
          `Alias "${alias}" for "${entry.name}" already names "${aliasOwner.name}"`,
        )
      }
      await store.insertAlias(owner.id, alias)
      owners.set(normalizeName(alias), owner)
    }
  }
}
