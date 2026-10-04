import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import type { Db } from '../db/client'
import {
  memberSkills,
  memberTargetRoles,
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
    super('Only the Admin can merge Catalog entries')
  }
}

type CatalogEntryRow = CatalogEntryRef & { normalizedName: string }

// How to merge entries in one Catalog. Every step runs in the merge's
// transaction.
type MergeStore = {
  catalog: 'Skill Catalog' | 'Role Catalog'
  find: (typed: string) => Promise<CatalogEntryRef | null>
  // Locks both entries until the merge ends, so no Member can start using
  // either one halfway through it.
  lock: (ids: number[]) => Promise<CatalogEntryRow[]>
  // Why this merge must not happen, if it mustn't.
  refuse?: (from: CatalogEntryRef, into: CatalogEntryRef) => Promise<string | null>
  moveMembers: (from: CatalogEntryRef, into: CatalogEntryRef) => Promise<void>
  moveAliases: (from: CatalogEntryRef, into: CatalogEntryRef) => Promise<void>
  remove: (entry: CatalogEntryRef) => Promise<void>
  addAlias: (into: CatalogEntryRef, alias: CatalogEntryRow) => Promise<void>
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
    catalog: 'Skill Catalog',
    find: (typed) => findSkill(db, typed),
    lock: (ids) =>
      db
        .select({ id: skills.id, name: skills.name, normalizedName: skills.normalizedName })
        .from(skills)
        .where(inArray(skills.id, ids))
        .for('update'),
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
    moveAliases: async (from, into) => {
      await db
        .update(skillAliases)
        .set({ skillId: into.id })
        .where(eq(skillAliases.skillId, from.id))
    },
    remove: async (entry) => {
      await db.delete(skills).where(eq(skills.id, entry.id))
    },
    addAlias: async (into, alias) => {
      await db.insert(skillAliases).values({
        skillId: into.id,
        name: alias.name,
        normalizedName: alias.normalizedName,
      })
    },
  })
}

// The same as `mergeSkills`, for the Role Catalog.
export function mergeTargetRoles(db: Db, form: MergeForm): Promise<MergeResult> {
  return mergeEntries(form, {
    catalog: 'Role Catalog',
    find: (typed) => findTargetRole(db, typed),
    lock: (ids) =>
      db
        .select({
          id: targetRoles.id,
          name: targetRoles.name,
          normalizedName: targetRoles.normalizedName,
        })
        .from(targetRoles)
        .where(inArray(targetRoles.id, ids))
        .for('update'),
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
    moveAliases: async (from, into) => {
      await db
        .update(targetRoleAliases)
        .set({ targetRoleId: into.id })
        .where(eq(targetRoleAliases.targetRoleId, from.id))
    },
    remove: async (entry) => {
      await db.delete(targetRoles).where(eq(targetRoles.id, entry.id))
    },
    addAlias: async (into, alias) => {
      await db.insert(targetRoleAliases).values({
        targetRoleId: into.id,
        name: alias.name,
        normalizedName: alias.normalizedName,
      })
    },
  })
}

// The merge both Catalogs share.
async function mergeEntries(
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
  const refusal = await store.refuse?.(from, into)
  if (refusal) return { ok: false, problem: refusal }

  await store.moveMembers(from, into)
  await store.moveAliases(from, into)
  await store.remove(from)
  await store.addAlias(into, fromRow)
  return { ok: true }
}
