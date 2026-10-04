import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { account, members, session, user } from '../db/schema'
import { NotAdminError } from './admin'
import { emptySearch } from './search'
import { testAdminDiscordUserId } from './test-directory'
import {
  memberInTolc,
  memberWithProfile,
  octoForm,
  seededSetup,
  type TestSetup,
} from './test-profiles'

async function adminAndOcto() {
  const setup = await seededSetup()
  const admin = await memberWithProfile(setup, 'tolc-owner', testAdminDiscordUserId)
  const octo = await memberWithProfile(setup, 'octocat')
  const octoId = (await setup.directory.memberForAuthUser(octo.authUserId))!.id
  const adminId = (await setup.directory.memberForAuthUser(admin.authUserId))!.id
  return { setup, admin: admin.authUserId, octo, octoId, adminId }
}

async function directoryNames(setup: TestSetup) {
  return (await setup.directory.searchDirectory(emptySearch)).map(
    (entry) => entry.discordHandle,
  )
}

describe('the Admin page Member list', () => {
  it('lists every Member, and every Hidden Member apart', async () => {
    const { setup, admin, octoId } = await adminAndOcto()
    await memberInTolc(setup, 'mona')
    await setup.directory.hideMember({ authUserId: admin, memberId: octoId })

    const managed = await setup.directory.managedMembers(admin)

    expect(managed.members.map((m) => m.name)).toEqual(['mona', 'Octo Cat'])
    expect(managed.members.find((m) => m.name === 'Octo Cat')?.isYou).toBe(true)
    expect(managed.hiddenMembers).toEqual([
      {
        id: octoId,
        name: 'Octo Cat',
        discordHandle: 'octocat_dc',
        githubUrl: 'https://github.com/octocat',
        isYou: false,
      },
    ])
  })

  it('is only for the Admin', async () => {
    const { setup, octo } = await adminAndOcto()

    await expect(setup.directory.managedMembers(octo.authUserId)).rejects.toThrow(
      NotAdminError,
    )
  })
})

describe('hiding a Member', () => {
  it('takes them out of the Directory but keeps their profile', async () => {
    const { setup, admin, octo, octoId } = await adminAndOcto()

    expect(
      await setup.directory.hideMember({ authUserId: admin, memberId: octoId }),
    ).toEqual({ ok: true })

    expect(await directoryNames(setup)).toEqual(['tolc-owner_dc'])
    expect(await setup.directory.memberProfile(octoId)).toBeNull()
    expect(await setup.directory.checkMembership({ authUserId: octo.authUserId })).toBe(
      'hidden',
    )
    const editing = await setup.directory.profileForEditing(octo.authUserId)
    expect(editing.details.firstName).toBe(octoForm.firstName)
  })

  it('never asks Discord about a Hidden Member', async () => {
    const { setup, admin, octo, octoId } = await adminAndOcto()
    await setup.directory.hideMember({ authUserId: admin, memberId: octoId })
    const checks = setup.tolc.checks

    await setup.directory.checkMembership({ authUserId: octo.authUserId })

    expect(setup.tolc.checks).toBe(checks)
  })

  it('refuses to hide the Admin', async () => {
    const { setup, admin, adminId } = await adminAndOcto()

    const result = await setup.directory.hideMember({
      authUserId: admin,
      memberId: adminId,
    })

    expect(result).toEqual({ ok: false, problem: "You can't hide yourself." })
    expect(await setup.directory.isAdmin(admin)).toBe(true)
  })

  it('is only for the Admin', async () => {
    const { setup, octo, adminId } = await adminAndOcto()

    await expect(
      setup.directory.hideMember({ authUserId: octo.authUserId, memberId: adminId }),
    ).rejects.toThrow(NotAdminError)
    expect(await directoryNames(setup)).toHaveLength(2)
  })

  it('reports a Member who no longer exists', async () => {
    const { setup, admin } = await adminAndOcto()

    expect(
      await setup.directory.hideMember({ authUserId: admin, memberId: 9999 }),
    ).toEqual({ ok: false, problem: 'That Member no longer exists.' })
  })
})

describe('reactivating a Hidden Member', () => {
  it('puts them back in the Directory without asking Discord', async () => {
    const { setup, admin, octo, octoId } = await adminAndOcto()
    await setup.directory.hideMember({ authUserId: admin, memberId: octoId })
    setup.tolc.leave(octo.discord.userId)
    const checks = setup.tolc.checks

    expect(
      await setup.directory.reactivateMember({ authUserId: admin, memberId: octoId }),
    ).toEqual({ ok: true })

    expect(await setup.directory.checkMembership({ authUserId: octo.authUserId })).toBe(
      'in-tolc',
    )
    expect(setup.tolc.checks).toBe(checks)
    expect(await directoryNames(setup)).toEqual(['tolc-owner_dc', 'octocat_dc'])
  })

  it('is only for the Admin', async () => {
    const { setup, admin, octo, octoId } = await adminAndOcto()
    await setup.directory.hideMember({ authUserId: admin, memberId: octoId })

    await expect(
      setup.directory.reactivateMember({ authUserId: octo.authUserId, memberId: octoId }),
    ).rejects.toThrow(NotAdminError)
  })
})

describe('deleting a Member', () => {
  it('removes the Member, their profile, and their sign-in', async () => {
    const { setup, admin, octo, octoId } = await adminAndOcto()
    await setup.db.insert(session).values({
      id: 'octo-session',
      token: 'octo-token',
      userId: octo.authUserId,
      expiresAt: new Date(Date.now() + 60_000),
      updatedAt: new Date(),
    })
    await setup.db.insert(account).values({
      id: 'octo-github',
      accountId: '583231',
      providerId: 'github',
      userId: octo.authUserId,
      updatedAt: new Date(),
    })

    expect(
      await setup.directory.deleteMember({ authUserId: admin, memberId: octoId }),
    ).toEqual({ ok: true })

    expect(await setup.directory.memberForAuthUser(octo.authUserId)).toBeNull()
    expect(await directoryNames(setup)).toEqual(['tolc-owner_dc'])
    const userId = octo.authUserId
    expect(await setup.db.select().from(user).where(eq(user.id, userId))).toEqual([])
    expect(
      await setup.db.select().from(session).where(eq(session.userId, userId)),
    ).toEqual([])
    expect(
      await setup.db.select().from(account).where(eq(account.userId, userId)),
    ).toEqual([])
  })

  it('keeps the Skills and Target Roles they added', async () => {
    const setup = await seededSetup()
    const admin = await memberWithProfile(setup, 'tolc-owner', testAdminDiscordUserId)
    const { authUserId } = await memberInTolc(setup, 'octocat')
    await setup.directory.completeProfile({
      authUserId,
      form: {
        ...octoForm,
        targetRoles: ['Prompt Whisperer'],
        preferredStack: { frontendFramework: 'Brand New Framework' },
      },
    })
    const memberId = (await setup.directory.memberForAuthUser(authUserId))!.id

    await setup.directory.deleteMember({ authUserId: admin.authUserId, memberId })

    const skillNames = (await setup.directory.skillCatalog()).map((s) => s.name)
    const roleNames = (await setup.directory.roleCatalog()).map((r) => r.name)
    expect(skillNames).toContain('Brand New Framework')
    expect(roleNames).toContain('Prompt Whisperer')
  })

  it('can delete a Hidden Member', async () => {
    const { setup, admin, octoId } = await adminAndOcto()
    await setup.directory.hideMember({ authUserId: admin, memberId: octoId })

    await setup.directory.deleteMember({ authUserId: admin, memberId: octoId })

    expect((await setup.directory.managedMembers(admin)).hiddenMembers).toEqual([])
  })

  it('refuses to delete the Admin', async () => {
    const { setup, admin, adminId } = await adminAndOcto()

    expect(
      await setup.directory.deleteMember({ authUserId: admin, memberId: adminId }),
    ).toEqual({ ok: false, problem: "You can't delete yourself." })
    expect(await setup.db.select().from(members).where(eq(members.id, adminId)))
      .toHaveLength(1)
  })

  it('is only for the Admin', async () => {
    const { setup, octo, adminId } = await adminAndOcto()

    await expect(
      setup.directory.deleteMember({ authUserId: octo.authUserId, memberId: adminId }),
    ).rejects.toThrow(NotAdminError)
    expect(await setup.directory.isAdmin(octo.authUserId)).toBe(false)
    expect(await directoryNames(setup)).toHaveLength(2)
  })
})
