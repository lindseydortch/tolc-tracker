import { and, asc, eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import {
  links,
  members,
  skillAliases,
  skills,
  targetRoleAliases,
  targetRoles,
} from '../db/schema'
import { normalizeName } from './normalize-name'

export type StackLayer = (typeof skills.$inferSelect)['suggestedLayer'] & {}

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
  links: MemberLink[]
}

export type SignedInMember = {
  id: number
  githubUrl: string
}

export function createDirectory(db: Db) {
  return {
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
          .select({ id: members.id, githubUrl: links.url, linkId: links.id })
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
        return { id: memberId, githubUrl }
      })
    },

    async memberForAuthUser(authUserId: string): Promise<Member | null> {
      const [member] = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.authUserId, authUserId))
      if (!member) return null
      const memberLinks = await db
        .select({ kind: links.kind, url: links.url, label: links.label })
        .from(links)
        .where(eq(links.memberId, member.id))
        .orderBy(asc(links.id))
      return { id: member.id, links: memberLinks }
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
}

export type Directory = ReturnType<typeof createDirectory>

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
