import { describe, expect, it } from 'vitest'
import { isDiscordSyncDue } from './directory'
import { discordAvatarUrl } from './discord-profile'
import { emptySearch } from './search'
import { createTestSetup } from './test-directory'
import { memberWithProfile, seededSetup } from './test-profiles'

describe('signing in a Member with GitHub', () => {
  it('creates a Member with their GitHub Link on first sign-in', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')

    const signedIn = await directory.signIn({
      authUserId,
      githubUsername: 'octocat',
    })

    expect(signedIn?.githubUrl).toBe('https://github.com/octocat')
    const member = await directory.memberForAuthUser(authUserId)
    expect(member?.links).toEqual([
      { kind: 'github', url: 'https://github.com/octocat', label: null },
    ])
  })

  it('reuses the same Member when they sign in again', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')

    const first = await directory.signIn({ authUserId, githubUsername: 'octocat' })
    const second = await directory.signIn({ authUserId, githubUsername: 'octocat' })

    expect(second?.id).toBe(first?.id)
    expect((await directory.memberForAuthUser(authUserId))?.links).toHaveLength(1)
  })

  it('updates the GitHub Link after a GitHub rename', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')
    await directory.signIn({ authUserId, githubUsername: 'octocat' })

    const signedIn = await directory.signIn({
      authUserId,
      githubUsername: 'octo-renamed',
    })

    expect(signedIn?.githubUrl).toBe('https://github.com/octo-renamed')
    expect((await directory.memberForAuthUser(authUserId))?.links).toEqual([
      { kind: 'github', url: 'https://github.com/octo-renamed', label: null },
    ])
  })

  it('treats a sign-in without a GitHub username as signed out', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')

    expect(await directory.signIn({ authUserId, githubUsername: null })).toBeNull()
    expect(await directory.memberForAuthUser(authUserId)).toBeNull()
  })

  it('has no Member for someone who never signed in', async () => {
    const { directory } = await createTestSetup()

    expect(await directory.memberForAuthUser('nobody')).toBeNull()
  })
})

describe('connecting Discord', () => {
  const octoDiscord = { userId: '80351110224678912', handle: 'octo_discord', avatar: null }

  it('has no Discord connection right after GitHub sign-in', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')

    const signedIn = await directory.signIn({
      authUserId,
      githubUsername: 'octocat',
    })

    expect(signedIn?.discord).toBeNull()
  })

  it('links Discord to the existing Member', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')
    const before = await directory.signIn({
      authUserId,
      githubUsername: 'octocat',
    })

    await directory.connectDiscord({
      authUserId,
      discord: octoDiscord,
    })

    const after = await directory.signIn({
      authUserId,
      githubUsername: 'octocat',
    })
    expect(after?.id).toBe(before?.id)
    expect(after?.discord).toEqual({
      userId: '80351110224678912',
      handle: 'octo_discord',
      avatar: null,
    })
  })

  it('refreshes the handle after a Discord rename', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')
    await directory.signIn({ authUserId, githubUsername: 'octocat' })
    await directory.connectDiscord({
      authUserId,
      discord: octoDiscord,
    })

    await directory.connectDiscord({
      authUserId,
      discord: { ...octoDiscord, handle: 'octo_renamed' },
    })

    const signedIn = await directory.signIn({
      authUserId,
      githubUsername: 'octocat',
    })
    expect(signedIn?.discord?.handle).toBe('octo_renamed')
  })

  it("shows the Member's current Discord avatar on their profile", async () => {
    const setup = await seededSetup()
    const { authUserId, discord } = await memberWithProfile(setup, 'octocat')
    const avatarUrl = async () => {
      const [entry] = await setup.directory.searchDirectory(emptySearch)
      const profile = await setup.directory.memberProfile(entry.id)
      expect(profile?.discordAvatarUrl).toBe(entry.discordAvatarUrl)
      return entry.discordAvatarUrl
    }
    expect(await avatarUrl()).toBe(discordAvatarUrl({ userId: discord.userId, avatar: null }))

    await setup.directory.connectDiscord({ authUserId, discord: { ...discord, avatar: 'a_1f2e' } })
    expect(await avatarUrl()).toBe(discordAvatarUrl({ userId: discord.userId, avatar: 'a_1f2e' }))

    await setup.directory.connectDiscord({ authUserId, discord: { ...discord, avatar: null } })
    expect(await avatarUrl()).toBe(discordAvatarUrl({ userId: discord.userId, avatar: null }))
  })

  it('refuses a Discord account already connected to another Member', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const first = await signUpWithGitHub('octocat')
    const second = await signUpWithGitHub('hubot')
    await directory.signIn({ authUserId: first, githubUsername: 'octocat' })
    await directory.signIn({ authUserId: second, githubUsername: 'hubot' })
    await directory.connectDiscord({ authUserId: first, discord: octoDiscord })

    await expect(
      directory.connectDiscord({ authUserId: second, discord: octoDiscord }),
    ).rejects.toThrow()
    const hubot = await directory.signIn({
      authUserId: second,
      githubUsername: 'hubot',
    })
    expect(hubot?.discord).toBeNull()
  })

  it('refuses to connect Discord for someone who never signed in', async () => {
    const { directory } = await createTestSetup()

    await expect(
      directory.connectDiscord({ authUserId: 'nobody', discord: octoDiscord }),
    ).rejects.toThrow('No Member for auth user "nobody"')
  })

  it('records when Discord was last synced', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')
    const before = await directory.signIn({
      authUserId,
      githubUsername: 'octocat',
    })
    const connectedAt = new Date()

    await directory.connectDiscord({ authUserId, discord: octoDiscord })

    const after = await directory.signIn({
      authUserId,
      githubUsername: 'octocat',
    })
    expect(before?.discordSyncedAt).toBeNull()
    expect(after?.discordSyncedAt?.getTime()).toBeGreaterThanOrEqual(
      connectedAt.getTime(),
    )
  })
})

describe('when to sync Discord', () => {
  const sessionStartedAt = new Date('2026-10-01T09:00:00Z')
  const minute = 60 * 1000
  const at = (ms: number) => new Date(sessionStartedAt.getTime() + ms)

  it('syncs when Discord was never synced', () => {
    expect(
      isDiscordSyncDue({ syncedAt: null, sessionStartedAt, linkedAt: at(0) }),
    ).toBe(true)
  })

  it('syncs once per sign-in', () => {
    expect(
      isDiscordSyncDue({ syncedAt: at(-minute), sessionStartedAt, linkedAt: at(-2 * minute) }),
    ).toBe(true)
    expect(
      isDiscordSyncDue({ syncedAt: at(minute), sessionStartedAt, linkedAt: at(-2 * minute) }),
    ).toBe(false)
  })

  it('syncs again after Discord is connected again in the same session', () => {
    expect(
      isDiscordSyncDue({ syncedAt: at(minute), sessionStartedAt, linkedAt: at(2 * minute) }),
    ).toBe(true)
  })
})
