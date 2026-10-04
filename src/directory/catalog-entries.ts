import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { skillAliases, skills, targetRoleAliases, targetRoles } from '../db/schema'
import type { StackLayer } from './directory'
import { normalizeName } from './normalize-name'
import { tidyName } from './profile'

export type CatalogEntryRef = { id: number; name: string }

// How to look up and add entries in one Catalog. Pass a transaction as
// `db` to look up and create in one step.
type CatalogStore = {
  // Entries whose canonical name, or one of whose Aliases, normalizes to `key`.
  byName: (key: string) => Promise<CatalogEntryRef[]>
  byAlias: (key: string) => Promise<CatalogEntryRef[]>
  // Adds an entry, doing nothing if its normalized name is already taken.
  insert: (name: string) => Promise<void>
  entryKind: string
}

export function findSkill(db: Db, typed: string): Promise<CatalogEntryRef | null> {
  return findEntry(skillStore(db, null), typed)
}

export function findTargetRole(db: Db, typed: string): Promise<CatalogEntryRef | null> {
  return findEntry(targetRoleStore(db), typed)
}

// The canonical Skill Catalog name for each typed name or Alias, or null
// where the Catalog has none. Blank names are dropped.
export function canonicalSkillNames(db: Db, typed: string[]): Promise<(string | null)[]> {
  return canonicalNames(skillStore(db, null), typed)
}

// The same as `canonicalSkillNames`, for the Role Catalog.
export function canonicalTargetRoleNames(
  db: Db,
  typed: string[],
): Promise<(string | null)[]> {
  return canonicalNames(targetRoleStore(db), typed)
}

// The Skill a typed name stands for, created in the Skill Catalog if it
// isn't there yet. A new Skill takes `suggestedLayer` as its hint.
export function findOrCreateSkill(
  db: Db,
  typed: string,
  suggestedLayer: StackLayer | null,
): Promise<CatalogEntryRef> {
  return findOrCreateEntry(skillStore(db, suggestedLayer), typed)
}

// The Target Role a typed name stands for, created in the Role Catalog if
// it isn't there yet.
export function findOrCreateTargetRole(db: Db, typed: string): Promise<CatalogEntryRef> {
  return findOrCreateEntry(targetRoleStore(db), typed)
}

// The entry a typed name or Alias stands for, if the Catalog has it.
async function findEntry(
  store: CatalogStore,
  typed: string,
): Promise<CatalogEntryRef | null> {
  const key = normalizeName(typed)
  const [byName] = await store.byName(key)
  if (byName) return byName
  const [byAlias] = await store.byAlias(key)
  return byAlias ?? null
}

function canonicalNames(store: CatalogStore, typed: string[]): Promise<(string | null)[]> {
  return Promise.all(
    typed
      .filter((name) => normalizeName(name))
      .map(async (name) => (await findEntry(store, name))?.name ?? null),
  )
}

async function findOrCreateEntry(
  store: CatalogStore,
  typed: string,
): Promise<CatalogEntryRef> {
  const found = await findEntry(store, typed)
  if (found) return found
  const name = tidyName(typed)
  if (!normalizeName(name)) throw new Error(`A ${store.entryKind} needs a name`)
  await store.insert(name)
  // Re-read, in case another Member created it at the same moment.
  const created = await findEntry(store, name)
  if (!created) throw new Error(`Could not create ${store.entryKind} "${name}"`)
  return created
}

function skillStore(db: Db, suggestedLayer: StackLayer | null): CatalogStore {
  const ref = { id: skills.id, name: skills.name }
  return {
    entryKind: 'Skill',
    byName: (key) => db.select(ref).from(skills).where(eq(skills.normalizedName, key)),
    byAlias: (key) =>
      db
        .select(ref)
        .from(skillAliases)
        .innerJoin(skills, eq(skillAliases.skillId, skills.id))
        .where(eq(skillAliases.normalizedName, key)),
    insert: async (name) => {
      await db
        .insert(skills)
        .values({ name, normalizedName: normalizeName(name), suggestedLayer })
        .onConflictDoNothing({ target: skills.normalizedName })
    },
  }
}

function targetRoleStore(db: Db): CatalogStore {
  const ref = { id: targetRoles.id, name: targetRoles.name }
  return {
    entryKind: 'Target Role',
    byName: (key) =>
      db.select(ref).from(targetRoles).where(eq(targetRoles.normalizedName, key)),
    byAlias: (key) =>
      db
        .select(ref)
        .from(targetRoleAliases)
        .innerJoin(targetRoles, eq(targetRoleAliases.targetRoleId, targetRoles.id))
        .where(eq(targetRoleAliases.normalizedName, key)),
    insert: async (name) => {
      await db
        .insert(targetRoles)
        .values({ name, normalizedName: normalizeName(name) })
        .onConflictDoNothing({ target: targetRoles.normalizedName })
    },
  }
}
