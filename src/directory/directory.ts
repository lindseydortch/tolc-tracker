import { and, asc, eq, inArray, isNotNull, isNull, sql, type SQL } from 'drizzle-orm'
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
import { NotAdminError } from './admin'
import { mergeSkills, mergeTargetRoles } from './catalog-merge'
import { canonicalSkillNames, canonicalTargetRoleNames } from './catalog-entries'
import type { MergeForm } from './merge-form'
import {
  deleteMember,
  hideMember,
  managedMembers,
  reactivateMember,
  type MemberAdminAction,
} from './member-admin'
import { normalizeName } from './normalize-name'
import { createProfileEditing } from './profile-editing'
import {
  isTypeScript,
  sortSeniorities,
  type Catalogs,
  type PreferredStack,
} from './profile'
import { rankSearchResults, type DirectorySearch } from './search'

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
  preferredStack: PreferredStack
  typeScriptBadge: boolean
}

// A merge the signed-in Member asks for; only the Admin's go through.
export type AdminMerge = MergeForm & { authUserId: string }

// The signed-in Member asking to hide, reactivate, or delete Member
// `memberId`; only the Admin's requests go through.
export type AdminMemberAction = { authUserId: string; memberId: number }

// A Directory entry plus the Secondary Skills its card leaves out.
type CompleteProfile = DirectoryEntry & { secondarySkills: string[] }

// Everything the profile page shows.
export type MemberProfile = CompleteProfile & { links: MemberLink[] }

// 'hidden': the Admin hid the Member. 'unknown': no Discord connected yet,
// or no answer from Discord to trust.
export type Membership = 'in-tolc' | 'not-in-tolc' | 'hidden' | 'unknown'

// Discord rate-limits each user's token, so never ask more often than this.
const membershipRetryMs = 30 * 1000

// `membershipChecker` is only needed by `checkMembership`.
// `adminDiscordUserId` names the Admin; without it, no one is.
export function createDirectory(
  db: Db,
  {
    membershipChecker,
    adminDiscordUserId,
  }: { membershipChecker?: MembershipChecker; adminDiscordUserId?: string | null } = {},
) {
  // Members with every required profile field filled, matching `where`.
  // A profile is complete only once the signup form has been sent and
  // Discord is connected, so a half-saved Member never shows up.
  async function completeProfiles(
    where: SQL | undefined,
  ): Promise<CompleteProfile[]> {
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
    const techStack = await db
      .select({
        memberId: memberSkills.memberId,
        layer: memberSkills.stackLayer,
        name: skills.name,
      })
      .from(memberSkills)
      .innerJoin(skills, eq(memberSkills.skillId, skills.id))
      .where(inArray(memberSkills.memberId, ids))
      .orderBy(asc(skills.name))

    const entries: CompleteProfile[] = []
    for (const row of rows) {
      const { firstName, lastName, discordHandle, jobSearchStatus } = row
      const own = <T extends { memberId: number }>(all: T[]) =>
        all.filter((item) => item.memberId === row.id)
      const preferred = own(seniorities).find((s) => s.preferred)
      const preferredStack: DirectoryEntry['preferredStack'] = {}
      const secondarySkills: string[] = []
      for (const skill of own(techStack)) {
        if (skill.layer) preferredStack[skill.layer] = skill.name
        else secondarySkills.push(skill.name)
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
        // Turning the Badge on adds TypeScript to the Tech Stack.
        typeScriptBadge: own(techStack).some((skill) => isTypeScript(skill.name)),
        secondarySkills,
      })
    }
    return entries
  }

  // Runs `act` in a transaction if `authUserId` is the Admin's, else throws
  // `NotAdminError`.
  async function asAdmin<T>(
    authUserId: string,
    act: (tx: Db) => Promise<T>,
  ): Promise<T> {
    if (!(await directory.isAdmin(authUserId))) throw new NotAdminError()
    return db.transaction(act)
  }

  function adminAction({ authUserId, memberId }: AdminMemberAction) {
    return {
      authUserId,
      action: { adminAuthUserId: authUserId, memberId } satisfies MemberAdminAction,
    }
  }

  const directory = {
    ...createProfileEditing(db, (): Promise<Catalogs> => directory.catalogs()),

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
          membershipPassedAt: sql`
            case when ${members.discordUserId} = ${discord.userId}
              then ${members.membershipPassedAt}
            end`,
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

    // Called on every signed-in page load. Asks Discord whether the
    // Member's Discord account is in TOLC until it passes once (at most twice
    // a minute while it hasn't), then never again (ADR 0003). A Hidden Member
    // is never asked. While Discord is unavailable the last answer stands;
    // once it refuses, the answer is dropped until it answers again.
    async checkMembership({
      authUserId,
      now = new Date(),
    }: {
      authUserId: string
      now?: Date
    }): Promise<Membership> {
      const [member] = await db
        .select({
          discordUserId: members.discordUserId,
          hidden: members.hidden,
          passedAt: members.membershipPassedAt,
          checkedAt: members.membershipCheckedAt,
          attemptedAt: members.membershipAttemptedAt,
        })
        .from(members)
        .where(eq(members.authUserId, authUserId))
      if (!member?.discordUserId) return 'unknown'
      if (member.hidden) return 'hidden'
      if (member.passedAt) return 'in-tolc'
      const { discordUserId, attemptedAt } = member
      let { checkedAt } = member

      if (attemptedAt && now.getTime() - attemptedAt.getTime() < membershipRetryMs) {
        return checkedAt ? 'not-in-tolc' : 'unknown'
      }
      if (!membershipChecker) {
        throw new Error('This Directory has no membership checker')
      }
      let passedAt: Date | null = null
      try {
        const inTolc = await membershipChecker.isInTolc({ authUserId, discordUserId })
        if (inTolc) passedAt = now
        checkedAt = inTolc ? null : now
      } catch (error) {
        console.error('Could not check TOLC membership', error)
        if (!(error instanceof DiscordUnavailableError)) checkedAt = null
      }
      await db
        .update(members)
        .set({
          membershipPassedAt: passedAt,
          membershipCheckedAt: checkedAt,
          membershipAttemptedAt: now,
        })
        .where(
          and(
            eq(members.authUserId, authUserId),
            // Skip if a different Discord account was connected meanwhile,
            // or an overlapping page load already recorded a pass.
            eq(members.discordUserId, discordUserId),
            isNull(members.membershipPassedAt),
          ),
        )
      if (passedAt) return 'in-tolc'
      return checkedAt ? 'not-in-tolc' : 'unknown'
    },

    // The Admin is the Member whose connected Discord account is the one
    // configured as the Admin's, once it has passed the membership check.
    async isAdmin(authUserId: string): Promise<boolean> {
      if (!adminDiscordUserId) return false
      const [member] = await db
        .select({ id: members.id })
        .from(members)
        .where(
          and(
            eq(members.authUserId, authUserId),
            eq(members.discordUserId, adminDiscordUserId),
            isNotNull(members.membershipPassedAt),
            eq(members.hidden, false),
          ),
        )
      return Boolean(member)
    },

    // Only the Admin may merge, so both throw `NotAdminError` for anyone
    // else. See `mergeSkills` and `mergeTargetRoles` for the rules.
    mergeSkills: ({ authUserId, ...form }: AdminMerge) =>
      asAdmin(authUserId, (tx) => mergeSkills(tx, form)),
    mergeTargetRoles: ({ authUserId, ...form }: AdminMerge) =>
      asAdmin(authUserId, (tx) => mergeTargetRoles(tx, form)),

    // Every Member for the Admin page, hidden ones apart. Like the actions
    // below, throws `NotAdminError` for anyone but the Admin, and those
    // refuse to act on the Admin themselves. See `member-admin.ts`.
    managedMembers: (authUserId: string) =>
      asAdmin(authUserId, (tx) => managedMembers(tx, authUserId)),
    hideMember(request: AdminMemberAction) {
      const { authUserId, action } = adminAction(request)
      return asAdmin(authUserId, (tx) => hideMember(tx, action))
    },
    reactivateMember(request: AdminMemberAction) {
      const { authUserId, action } = adminAction(request)
      return asAdmin(authUserId, (tx) => reactivateMember(tx, action))
    },
    deleteMember(request: AdminMemberAction) {
      const { authUserId, action } = adminAction(request)
      return asAdmin(authUserId, (tx) => deleteMember(tx, action))
    },

    async isProfileComplete(authUserId: string): Promise<boolean> {
      const found = await completeProfiles(eq(members.authUserId, authUserId))
      return found.length > 0
    },

    // The Directory Members matching `search`, best first: see
    // `rankSearchResults`. With nothing chosen, every complete, non-hidden
    // Member, whatever their Job Search Status.
    async searchDirectory(search: DirectorySearch): Promise<DirectoryEntry[]> {
      const profiles = await completeProfiles(eq(members.hidden, false))
      const ranked = rankSearchResults(profiles, {
        ...search,
        skills: await canonicalSkillNames(db, search.skills),
        targetRoles: await canonicalTargetRoleNames(db, search.targetRoles),
      })
      // Secondary Skills stay off the cards; they're on the profile page.
      return ranked.map(({ secondarySkills: _, ...entry }) => entry)
    },

    // Null unless the Member is in the Directory, so a Hidden Member or an
    // incomplete profile can't be reached by its id.
    async memberProfile(memberId: number): Promise<MemberProfile | null> {
      const [profile] = await completeProfiles(
        and(eq(members.id, memberId), eq(members.hidden, false)),
      )
      if (!profile) return null
      const memberLinks = await db
        .select({ kind: links.kind, url: links.url, label: links.label })
        .from(links)
        .where(eq(links.memberId, memberId))
        // Link kinds sort in the order the `link_kind` enum declares them.
        .orderBy(asc(links.kind), asc(links.id))
      return { ...profile, links: memberLinks }
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
