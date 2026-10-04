import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm'
import type { Db } from '../db/client'
import {
  memberSkills,
  memberTargetRoles,
  members,
  skillAliases,
  skills,
  targetRoleAliases,
  targetRoles,
} from '../db/schema'
import { findSkill, findTargetRole, type CatalogEntryRef } from './catalog-entries'
import type { MergeForm } from './merge-form'
import { isTypeScript, typeScript, type SaveResult } from './profile'

export type MergeResult = SaveResult<{ problem: string }>

// Thrown when anyone but the Admin tries to merge.
export class NotAdminError extends Error {
  constructor() {
    super('Only the Admin can merge Skills and Target Roles')
  }
}

type CatalogEntryRow = CatalogEntryRef & { normalizedName: string }

// The tables behind one Catalog, so both Catalogs merge the same way.
type CatalogTables =
  | {
      entries: typeof skills
      aliases: typeof skillAliases
      aliasOwner: typeof skillAliases.skillId
      aliasOwnerKey: 'skillId'
      memberEntries: typeof memberSkills
      memberEntry: typeof memberSkills.skillId
    }
  | {
      entries: typeof targetRoles
      aliases: typeof targetRoleAliases
      aliasOwner: typeof targetRoleAliases.targetRoleId
      aliasOwnerKey: 'targetRoleId'
      memberEntries: typeof memberTargetRoles
      memberEntry: typeof memberTargetRoles.targetRoleId
    }

// How to merge entries in one Catalog. Every step runs in the merge's
// transaction.
export type MergeStore = {
  catalog: 'Skill Catalog' | 'Role Catalog'
  find: (typed: string) => Promise<CatalogEntryRef | null>
  // Locks the Members using either entry, then both entries, until the
  // merge ends. Profile edits lock the Member first too, so the two wait
  // for each other instead of deadlocking, and no Member can start using
  // either entry halfway through. Returns the entries still there.
  lock: (ids: number[]) => Promise<CatalogEntryRow[]>
  // The entry an Alias already names, if any.
  aliasOwner: (normalizedName: string) => Promise<CatalogEntryRef | null>
  // Why this merge must not happen, if it mustn't.
  refuse?: (from: CatalogEntryRef, into: CatalogEntryRef) => Promise<string | null>
  moveMembers: (from: CatalogEntryRef, into: CatalogEntryRef) => Promise<void>
  // Moves `from`'s Aliases to `into`, removes `from`, and makes its name
  // an Alias of `into`.
  absorb: (from: CatalogEntryRow, into: CatalogEntryRef) => Promise<void>
}

// Merges the Skill `from` names into the Skill `into` names: `from`'s name
// and Aliases become Aliases of `into`, every Member using `from` now uses
// `into`, and `from` is removed. A Member who had both keeps one entry, in
// whichever Stack Layer either filled (`into`'s if both did). TypeScript
// can only be merged into, and never from a Skill filling a Stack Layer, so
// it stays out of the Preferred Stack. Pass a transaction as `db`.
export function mergeSkills(db: Db, form: MergeForm): Promise<MergeResult> {
  const memberSkill = (memberId: number, skillId: number) =>
    and(eq(memberSkills.memberId, memberId), eq(memberSkills.skillId, skillId))

  return mergeEntries(form, {
    ...catalogSteps(db, {
      entries: skills,
      aliases: skillAliases,
      aliasOwner: skillAliases.skillId,
      aliasOwnerKey: 'skillId',
      memberEntries: memberSkills,
      memberEntry: memberSkills.skillId,
    }),
    catalog: 'Skill Catalog',
    find: (typed) => findSkill(db, typed),
    refuse: async (from, into) => {
      if (isTypeScript(from.name)) {
        return `${typeScript} backs the TypeScript Badge, so it can only be merged into`
      }
      if (!isTypeScript(into.name)) return null
      const [primary] = await db
        .select({ memberId: memberSkills.memberId })
        .from(memberSkills)
        .where(and(eq(memberSkills.skillId, from.id), isNotNull(memberSkills.stackLayer)))
        .limit(1)
      return primary
        ? `${from.name} fills a Stack Layer for a Member, and ${typeScript} never can`
        : null
    },
    moveMembers: async (from, into) => {
      const using = await db
        .select()
        .from(memberSkills)
        .where(inArray(memberSkills.skillId, [from.id, into.id]))
      for (const fromRow of using.filter((row) => row.skillId === from.id)) {
        const intoRow = using.find(
          (row) => row.skillId === into.id && row.memberId === fromRow.memberId,
        )
        if (!intoRow) {
          await db
            .update(memberSkills)
            .set({ skillId: into.id })
            .where(memberSkill(fromRow.memberId, from.id))
          continue
        }
        // Delete first: a Stack Layer holds only one Skill at a time.
        await db.delete(memberSkills).where(memberSkill(fromRow.memberId, from.id))
        if (!intoRow.stackLayer && fromRow.stackLayer) {
          await db
            .update(memberSkills)
            .set({ stackLayer: fromRow.stackLayer })
            .where(memberSkill(intoRow.memberId, into.id))
        }
      }
    },
  })
}

// The same as `mergeSkills`, for the Role Catalog.
export function mergeTargetRoles(db: Db, form: MergeForm): Promise<MergeResult> {
  return mergeEntries(form, {
    ...catalogSteps(db, {
      entries: targetRoles,
      aliases: targetRoleAliases,
      aliasOwner: targetRoleAliases.targetRoleId,
      aliasOwnerKey: 'targetRoleId',
      memberEntries: memberTargetRoles,
      memberEntry: memberTargetRoles.targetRoleId,
    }),
    catalog: 'Role Catalog',
    find: (typed) => findTargetRole(db, typed),
    moveMembers: async (from, into) => {
      const alreadyInto = db
        .select({ memberId: memberTargetRoles.memberId })
        .from(memberTargetRoles)
        .where(eq(memberTargetRoles.targetRoleId, into.id))
      await db
        .delete(memberTargetRoles)
        .where(
          and(
            eq(memberTargetRoles.targetRoleId, from.id),
            inArray(memberTargetRoles.memberId, alreadyInto),
          ),
        )
      await db
        .update(memberTargetRoles)
        .set({ targetRoleId: into.id })
        .where(eq(memberTargetRoles.targetRoleId, from.id))
    },
  })
}

// The steps that differ between the Catalogs only by table.
function catalogSteps(
  db: Db,
  { entries, aliases, aliasOwner, aliasOwnerKey, memberEntries, memberEntry }: CatalogTables,
): Pick<MergeStore, 'lock' | 'aliasOwner' | 'absorb'> {
  return {
    lock: async (ids) => {
      await db
        .select({ id: members.id })
        .from(members)
        .where(
          inArray(
            members.id,
            db
              .select({ memberId: memberEntries.memberId })
              .from(memberEntries)
              .where(inArray(memberEntry, ids)),
          ),
        )
        .orderBy(asc(members.id))
        .for('update')
      return db
        .select({ id: entries.id, name: entries.name, normalizedName: entries.normalizedName })
        .from(entries)
        .where(inArray(entries.id, ids))
        .orderBy(asc(entries.id))
        .for('update')
    },
    aliasOwner: async (normalizedName) => {
      const [owner] = await db
        .select({ id: entries.id, name: entries.name })
        .from(aliases)
        .innerJoin(entries, eq(aliasOwner, entries.id))
        .where(eq(aliases.normalizedName, normalizedName))
      return owner ?? null
    },
    absorb: async (from, into) => {
      await db
        .update(aliases)
        .set({ [aliasOwnerKey]: into.id })
        .where(eq(aliasOwner, from.id))
      await db.delete(entries).where(eq(entries.id, from.id))
      // Does nothing when `into` already has an Alias spelt like `from`.
      await db
        .insert(aliases)
        .values({ [aliasOwnerKey]: into.id, name: from.name, normalizedName: from.normalizedName })
        .onConflictDoNothing({ target: aliases.normalizedName })
    },
  }
}

// The merge both Catalogs share. Exported for tests only.
export async function mergeEntries(
  { from: typedFrom, into: typedInto }: MergeForm,
  store: MergeStore,
): Promise<MergeResult> {
  const from = await store.find(typedFrom)
  if (!from) return { ok: false, problem: `The ${store.catalog} has no "${typedFrom}"` }
  const into = await store.find(typedInto)
  if (!into) return { ok: false, problem: `The ${store.catalog} has no "${typedInto}"` }
  if (from.id === into.id) {
    return { ok: false, problem: `"${typedFrom}" and "${typedInto}" are both ${into.name}` }
  }
  const locked = await store.lock([from.id, into.id])
  const fromRow = locked.find((row) => row.id === from.id)
  // Another merge removed one of them between finding and locking.
  if (!fromRow || locked.length !== 2) {
    return { ok: false, problem: `The ${store.catalog} just changed. Try again.` }
  }
  const owner = await store.aliasOwner(fromRow.normalizedName)
  if (owner && owner.id !== into.id) {
    return { ok: false, problem: `"${from.name}" is already an Alias of ${owner.name}` }
  }
  const refusal = await store.refuse?.(from, into)
  if (refusal) return { ok: false, problem: refusal }

  await store.moveMembers(from, into)
  await store.absorb(fromRow, into)
  return { ok: true }
}
