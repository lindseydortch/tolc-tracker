import { and, eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { links, members, user } from '../db/schema'
import type { SaveResult } from './profile'

export type MemberAdminResult = SaveResult<{ problem: string }>

// A Member as the Admin page lists them, whether or not their profile is
// complete.
export type ManagedMember = {
  id: number
  // "First Last" once the signup form is sent, else the GitHub username.
  name: string
  discordHandle: string | null
  githubUrl: string | null
  // The Admin themselves, who can't be hidden or deleted.
  isYou: boolean
}

export type ManagedMembers = {
  members: ManagedMember[]
  hiddenMembers: ManagedMember[]
}

// The signed-in Member (`authUserId`) asking to act on Member `memberId`.
// The Directory lets it through only for the Admin.
export type AdminMemberAction = { authUserId: string; memberId: number }

export async function managedMembers(
  db: Db,
  adminAuthUserId: string,
): Promise<ManagedMembers> {
  const rows = await db
    .select({
      id: members.id,
      authUserId: members.authUserId,
      hidden: members.hidden,
      firstName: members.firstName,
      lastName: members.lastName,
      githubUsername: user.githubUsername,
      userName: user.name,
      discordHandle: members.discordHandle,
      githubUrl: links.url,
    })
    .from(members)
    .innerJoin(user, eq(members.authUserId, user.id))
    .leftJoin(links, and(eq(links.memberId, members.id), eq(links.kind, 'github')))
  const managed = rows
    .map((row) => ({
      hidden: row.hidden,
      member: {
        id: row.id,
        name:
          row.firstName && row.lastName
            ? `${row.firstName} ${row.lastName}`
            : (row.githubUsername ?? row.userName),
        discordHandle: row.discordHandle,
        githubUrl: row.githubUrl,
        isYou: row.authUserId === adminAuthUserId,
      },
    }))
    .sort(
      (a, b) =>
        a.member.name.localeCompare(b.member.name, 'en', { sensitivity: 'base' }) ||
        a.member.id - b.member.id,
    )
  return {
    members: managed.filter((row) => !row.hidden).map((row) => row.member),
    hiddenMembers: managed.filter((row) => row.hidden).map((row) => row.member),
  }
}

// Takes the Member out of the Directory, keeping their profile. They land on
// the Members-only notice from their next page load.
export function hideMember(db: Db, action: AdminMemberAction) {
  return setHidden(db, action, true)
}

// Puts a Hidden Member back in the Directory, without asking Discord.
export function reactivateMember(db: Db, action: AdminMemberAction) {
  return setHidden(db, action, false)
}

// Removes the Member's auth user, which takes their Member row, profile,
// sessions, and linked accounts with it. Catalog entries they added stay.
export async function deleteMember(
  db: Db,
  action: AdminMemberAction,
): Promise<MemberAdminResult> {
  const target = await findTarget(db, action, "You can't delete yourself.")
  if (!target.ok) return target
  await db.delete(user).where(eq(user.id, target.authUserId))
  return { ok: true }
}

async function setHidden(
  db: Db,
  action: AdminMemberAction,
  hidden: boolean,
): Promise<MemberAdminResult> {
  const target = await findTarget(db, action, "You can't hide yourself.")
  if (!target.ok) return target
  await db.update(members).set({ hidden }).where(eq(members.id, action.memberId))
  return { ok: true }
}

// The Member to act on, locked until the action ends, unless it's the Admin
// themselves or gone.
async function findTarget(
  db: Db,
  { authUserId: adminAuthUserId, memberId }: AdminMemberAction,
  notYourself: string,
): Promise<{ ok: true; authUserId: string } | { ok: false; problem: string }> {
  const [target] = await db
    .select({ authUserId: members.authUserId })
    .from(members)
    .where(eq(members.id, memberId))
    .for('update')
  if (!target) return { ok: false, problem: 'That Member no longer exists.' }
  if (target.authUserId === adminAuthUserId) return { ok: false, problem: notYourself }
  return { ok: true, authUserId: target.authUserId }
}
