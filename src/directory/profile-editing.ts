import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Db } from '../db/client'
import {
  links,
  memberSeniorities,
  memberSkills,
  memberTargetRoles,
  members,
  skills,
  targetRoles,
} from '../db/schema'
import {
  findOrCreateSkill,
  findOrCreateTargetRole,
  findSkill,
} from './catalog-entries'
import type { LinkKind, StackLayer } from './directory'
import { normalizeName } from './normalize-name'
import {
  checkDetails,
  checkProfile,
  isTypeScript,
  sortSeniorities,
  typeScript,
  type Catalogs,
  type DetailsForm,
  type ProfileForm,
  type ProfileProblems,
  type ResolvedDetails,
  type SaveResult,
} from './profile'
import {
  checkLinks,
  linksFrom,
  optionalLinks,
  type LinksForm,
  type LinksProblems,
} from './profile-links'

export type TechStackSkill = { name: string; stackLayer: StackLayer | null }

export type ProfileForEditing = {
  details: DetailsForm
  links: LinksForm
  techStack: TechStackSkill[]
  // On exactly when TypeScript is in the Member's Tech Stack, where it can
  // only ever be a Secondary Skill.
  typeScriptBadge: boolean
}

export type FormResult = SaveResult<{ problems: ProfileProblems }>

export type LinksResult = SaveResult<{ problems: LinksProblems }>

export type EditResult = SaveResult<{ problem: string }>

// `occupiedBy`: the Stack Layer already holds that Skill, and the Member
// should be asked whether to replace it.
export type AddSkillResult = EditResult | SaveResult<{ occupiedBy: string }>

// Edits to a Member's own profile. Every edit is keyed by the signed-in
// Member's `authUserId`, so no one can edit someone else's profile.
export function createProfileEditing(
  db: Db,
  catalogs: () => Promise<Catalogs>,
) {
  // Pass a transaction as `tx` to lock the Member's row until it ends, so
  // two saves of one profile (two tabs, a double submit) take turns
  // instead of colliding on its unique rows.
  async function memberId(authUserId: string, tx?: Db): Promise<number> {
    const query = (tx ?? db)
      .select({ id: members.id })
      .from(members)
      .where(eq(members.authUserId, authUserId))
    const [member] = tx ? await query.for('update') : await query
    if (!member) throw new Error(`No Member for auth user "${authUserId}"`)
    return member.id
  }

  // Puts a Skill the Member has, or is adding, in a Stack Layer.
  async function putInStackLayer(
    tx: Db,
    memberId: number,
    skillId: number,
    stackLayer: StackLayer,
  ) {
    await tx
      .insert(memberSkills)
      .values({ memberId, skillId, stackLayer })
      .onConflictDoUpdate({
        target: [memberSkills.memberId, memberSkills.skillId],
        set: { stackLayer },
      })
  }

  // Replaces the Member's details: names, LinkedIn Link, Job Search
  // Status, Target Roles and Seniorities.
  async function saveDetails(tx: Db, memberId: number, details: ResolvedDetails) {
    await tx
      .update(members)
      .set({
        firstName: details.firstName,
        lastName: details.lastName,
        jobSearchStatus: details.jobSearchStatus,
      })
      .where(eq(members.id, memberId))

    await tx
      .delete(links)
      .where(and(eq(links.memberId, memberId), eq(links.kind, 'linkedin')))
    await tx
      .insert(links)
      .values({ memberId, kind: 'linkedin', url: details.linkedinUrl })

    await tx.delete(memberTargetRoles).where(eq(memberTargetRoles.memberId, memberId))
    for (const name of details.targetRoles) {
      const role = await findOrCreateTargetRole(tx, name)
      await tx
        .insert(memberTargetRoles)
        .values({ memberId, targetRoleId: role.id })
        .onConflictDoNothing()
    }

    await tx.delete(memberSeniorities).where(eq(memberSeniorities.memberId, memberId))
    await tx.insert(memberSeniorities).values([
      { memberId, seniority: details.preferredSeniority, preferred: true },
      ...details.otherSeniorities.map((seniority) => ({
        memberId,
        seniority,
        preferred: false,
      })),
    ])
  }

  const editing = {
    // Saves the signup form, or returns what blocks it. Sending it again
    // replaces the profile; Skills dropped from the Preferred Stack stay on
    // as Secondary Skills. New names are added to the Catalogs, and a new
    // Skill takes its Stack Layer as its suggested Layer.
    async completeProfile({
      authUserId,
      form,
    }: {
      authUserId: string
      form: ProfileForm
    }): Promise<FormResult> {
      const check = checkProfile(form, await catalogs())
      if (!check.ok) return check
      const { profile } = check

      await db.transaction(async (tx) => {
        const id = await memberId(authUserId, tx)
        await saveDetails(tx, id, profile)
        await tx
          .update(memberSkills)
          .set({ stackLayer: null })
          .where(eq(memberSkills.memberId, id))
        for (const [stackLayer, name] of Object.entries(profile.preferredStack) as [
          StackLayer,
          string,
        ][]) {
          const skill = await findOrCreateSkill(tx, name, stackLayer)
          await putInStackLayer(tx, id, skill.id, stackLayer)
        }
      })
      return { ok: true }
    },

    // Saves the details from the profile editor, or returns what blocks it.
    async updateDetails({
      authUserId,
      form,
    }: {
      authUserId: string
      form: DetailsForm
    }): Promise<FormResult> {
      const check = checkDetails(form, await catalogs())
      if (!check.ok) return check
      await db.transaction(async (tx) =>
        saveDetails(tx, await memberId(authUserId, tx), check.details),
      )
      return { ok: true }
    },

    async profileForEditing(authUserId: string): Promise<ProfileForEditing> {
      const id = await memberId(authUserId)
      const [member] = await db
        .select({
          firstName: members.firstName,
          lastName: members.lastName,
          jobSearchStatus: members.jobSearchStatus,
        })
        .from(members)
        .where(eq(members.id, id))
      const memberLinks = await db
        .select({ kind: links.kind, url: links.url, label: links.label })
        .from(links)
        .where(eq(links.memberId, id))
        .orderBy(asc(links.id))
      const linkOf = (kind: LinkKind) =>
        memberLinks.find((link) => link.kind === kind)?.url ?? ''
      const savedLinks = linksFrom(
        linkOf,
        memberLinks
          .filter((link) => link.kind === 'custom')
          .map((link) => ({ label: link.label ?? '', url: link.url })),
      )
      const roles = await db
        .select({ name: targetRoles.name })
        .from(memberTargetRoles)
        .innerJoin(targetRoles, eq(memberTargetRoles.targetRoleId, targetRoles.id))
        .where(eq(memberTargetRoles.memberId, id))
        .orderBy(asc(targetRoles.name))
      const seniorities = await db
        .select()
        .from(memberSeniorities)
        .where(eq(memberSeniorities.memberId, id))
      const techStack = await db
        .select({ name: skills.name, stackLayer: memberSkills.stackLayer })
        .from(memberSkills)
        .innerJoin(skills, eq(memberSkills.skillId, skills.id))
        .where(eq(memberSkills.memberId, id))
        .orderBy(asc(skills.name))
      return {
        details: {
          firstName: member.firstName ?? '',
          lastName: member.lastName ?? '',
          linkedinUrl: linkOf('linkedin'),
          jobSearchStatus: member.jobSearchStatus,
          targetRoles: roles.map((role) => role.name),
          preferredSeniority:
            seniorities.find((s) => s.preferred)?.seniority ?? null,
          otherSeniorities: sortSeniorities(
            seniorities.filter((s) => !s.preferred).map((s) => s.seniority),
          ),
        },
        links: savedLinks,
        techStack,
        typeScriptBadge: techStack.some((skill) => isTypeScript(skill.name)),
      }
    },

    // Adds a Skill to the Member's Tech Stack, as a Secondary Skill or in a
    // Stack Layer. An occupied Stack Layer is only taken over with
    // `replace`, and the Skill it held becomes a Secondary Skill.
    async addSkill({
      authUserId,
      skill: typed,
      stackLayer = null,
      replace = false,
    }: {
      authUserId: string
      skill: string
      stackLayer?: StackLayer | null
      replace?: boolean
    }): Promise<AddSkillResult> {
      if (!normalizeName(typed)) return { ok: false, problem: 'Enter a Skill name' }
      return db.transaction(async (tx) => {
        const id = await memberId(authUserId, tx)
        const known = await findSkill(tx, typed)
        if (stackLayer && isTypeScript(known?.name ?? typed)) {
          return { ok: false, problem: 'TypeScript can never fill a Stack Layer' }
        }
        if (!stackLayer) {
          const skill = known ?? (await findOrCreateSkill(tx, typed, null))
          await tx
            .insert(memberSkills)
            .values({ memberId: id, skillId: skill.id })
            .onConflictDoNothing()
          return { ok: true }
        }
        const [occupant] = await tx
          .select({ skillId: memberSkills.skillId, name: skills.name })
          .from(memberSkills)
          .innerJoin(skills, eq(memberSkills.skillId, skills.id))
          .where(
            and(eq(memberSkills.memberId, id), eq(memberSkills.stackLayer, stackLayer)),
          )
        if (occupant && occupant.skillId !== known?.id) {
          if (!replace) return { ok: false, occupiedBy: occupant.name }
          await tx
            .update(memberSkills)
            .set({ stackLayer: null })
            .where(
              and(
                eq(memberSkills.memberId, id),
                eq(memberSkills.skillId, occupant.skillId),
              ),
            )
        }
        const skill = known ?? (await findOrCreateSkill(tx, typed, stackLayer))
        await putInStackLayer(tx, id, skill.id, stackLayer)
        return { ok: true }
      })
    },

    // Takes a Skill off the Member's Tech Stack, unless it is their last
    // Primary Skill: a profile without one drops out of the Directory.
    async removeSkill({
      authUserId,
      skill,
    }: {
      authUserId: string
      skill: string
    }): Promise<EditResult> {
      return db.transaction(async (tx) => {
        const id = await memberId(authUserId, tx)
        const memberTechStack = await tx
          .select({
            skillId: memberSkills.skillId,
            name: skills.name,
            stackLayer: memberSkills.stackLayer,
          })
          .from(memberSkills)
          .innerJoin(skills, eq(memberSkills.skillId, skills.id))
          .where(eq(memberSkills.memberId, id))
        const target = await findSkill(tx, skill)
        const removed = memberTechStack.find((row) => row.skillId === target?.id)
        if (!removed) return { ok: true }
        const primaries = memberTechStack.filter((row) => row.stackLayer)
        if (removed.stackLayer && primaries.length === 1) {
          return {
            ok: false,
            problem: `Your Preferred Stack needs at least one Skill. Add another before removing ${removed.name}.`,
          }
        }
        await tx
          .delete(memberSkills)
          .where(
            and(eq(memberSkills.memberId, id), eq(memberSkills.skillId, removed.skillId)),
          )
        return { ok: true }
      })
    },

    // Replaces the Member's optional Links and Custom Links, or returns what
    // blocks it. LinkedIn and GitHub are kept as they are.
    async saveLinks({
      authUserId,
      links: form,
    }: {
      authUserId: string
      links: LinksForm
    }): Promise<LinksResult> {
      const check = checkLinks(form)
      if (!check.ok) return check
      const saved = check.links
      await db.transaction(async (tx) => {
        const id = await memberId(authUserId, tx)
        await tx
          .delete(links)
          .where(and(eq(links.memberId, id), inArray(links.kind, optionalLinkKinds)))
        const rows = [
          ...optionalLinks
            .filter(({ kind }) => saved[kind])
            .map(({ kind }) => ({ memberId: id, kind, url: saved[kind] })),
          ...saved.custom.map(({ label, url }) => ({
            memberId: id,
            kind: 'custom' as const,
            url,
            label,
          })),
        ]
        if (rows.length > 0) await tx.insert(links).values(rows)
      })
      return { ok: true }
    },

    async setTypeScriptBadge({
      authUserId,
      on,
    }: {
      authUserId: string
      on: boolean
    }): Promise<void> {
      const result = on
        ? await editing.addSkill({ authUserId, skill: typeScript })
        : await editing.removeSkill({ authUserId, skill: typeScript })
      if (!result.ok) throw new Error('Could not change the TypeScript Badge')
    },
  }
  return editing
}

const optionalLinkKinds: LinkKind[] = [...optionalLinks.map(({ kind }) => kind), 'custom']
