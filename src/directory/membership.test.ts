import { describe, expect, it } from 'vitest'
import { createTestSetup } from './test-directory'

const octoDiscord = { userId: '80351110224678912', handle: 'octo_discord' }
const second = 1000
const hour = 60 * 60 * second

// A Member signed in with GitHub and connected to Discord. `refresh` loads a
// page at `now` in a session that started at `sessionStartedAt`; `after`
// gives a time that long after the first session started.
async function connectedMember() {
  const setup = await createTestSetup()
  const authUserId = await setup.signUpWithGitHub('octocat')
  await setup.directory.signIn({ authUserId, githubUsername: 'octocat' })
  await setup.directory.connectDiscord({ authUserId, discord: octoDiscord })
  const firstSignIn = new Date('2026-10-01T09:00:00Z')
  const after = (ms: number) => new Date(firstSignIn.getTime() + ms)
  const refresh = (now: Date, sessionStartedAt = firstSignIn) =>
    setup.directory.refreshMembership({ authUserId, sessionStartedAt, now })
  // A page load in a new session started at `now`.
  const signInAgain = (now: Date) => refresh(now, now)
  return { ...setup, authUserId, firstSignIn, after, refresh, signInAgain }
}

describe('the TOLC membership gate', () => {
  it('lets in a Member who is in TOLC', async () => {
    const { tolc, refresh, firstSignIn } = await connectedMember()
    tolc.join(octoDiscord.userId)

    expect(await refresh(firstSignIn)).toBe('in-tolc')
  })

  it('keeps out and hides someone who is not in TOLC', async () => {
    const { directory, authUserId, refresh, firstSignIn } =
      await connectedMember()

    expect(await refresh(firstSignIn)).toBe('not-in-tolc')
    expect((await directory.memberForAuthUser(authUserId))?.hidden).toBe(true)
  })

  it('hides, but keeps, a Member who leaves TOLC', async () => {
    const { directory, tolc, authUserId, refresh, signInAgain, firstSignIn, after } =
      await connectedMember()
    tolc.join(octoDiscord.userId)
    await refresh(firstSignIn)

    tolc.leave(octoDiscord.userId)

    expect(await signInAgain(after(2 * hour))).toBe('not-in-tolc')
    const member = await directory.memberForAuthUser(authUserId)
    expect(member?.hidden).toBe(true)
    expect(member?.links).toHaveLength(1)
  })

  it('unhides a Hidden Member who rejoins TOLC', async () => {
    const { directory, tolc, authUserId, refresh, signInAgain, firstSignIn, after } =
      await connectedMember()
    await refresh(firstSignIn)

    tolc.join(octoDiscord.userId)

    expect(await signInAgain(after(2 * hour))).toBe('in-tolc')
    expect((await directory.memberForAuthUser(authUserId))?.hidden).toBe(false)
  })

  it('lets in someone who joins TOLC on a page load half a minute later', async () => {
    const { tolc, refresh, firstSignIn, after } = await connectedMember()
    await refresh(firstSignIn)

    tolc.join(octoDiscord.userId)

    expect(await refresh(after(29 * second))).toBe('not-in-tolc')
    expect(await refresh(after(30 * second))).toBe('in-tolc')
  })

  it('checks once per sign-in, not on every page load', async () => {
    const { tolc, refresh, signInAgain, firstSignIn, after } =
      await connectedMember()
    tolc.join(octoDiscord.userId)

    await refresh(firstSignIn)
    await refresh(after(hour))
    expect(tolc.checks).toBe(1)

    await signInAgain(after(2 * hour))
    expect(tolc.checks).toBe(2)
  })

  it('checks again after a day in the same session', async () => {
    const { tolc, refresh, firstSignIn, after } = await connectedMember()
    tolc.join(octoDiscord.userId)
    await refresh(firstSignIn)

    tolc.leave(octoDiscord.userId)

    expect(await refresh(after(23 * hour))).toBe('in-tolc')
    expect(await refresh(after(24 * hour))).toBe('not-in-tolc')
  })

  it('keeps the last answer while Discord is unavailable', async () => {
    const { tolc, refresh, signInAgain, firstSignIn, after } =
      await connectedMember()
    tolc.join(octoDiscord.userId)
    await refresh(firstSignIn)

    tolc.goDown()

    expect(await signInAgain(after(2 * hour))).toBe('in-tolc')
  })

  it('retries half a minute after Discord was unavailable', async () => {
    const { tolc, refresh, firstSignIn, after } = await connectedMember()
    tolc.join(octoDiscord.userId)
    tolc.goDown()
    expect(await refresh(firstSignIn)).toBe('unknown')

    tolc.comeBack()

    expect(await refresh(after(29 * second))).toBe('unknown')
    expect(await refresh(after(30 * second))).toBe('in-tolc')
  })

  it('stops trusting the last answer when Discord refuses to answer', async () => {
    const { tolc, refresh, signInAgain, firstSignIn, after } =
      await connectedMember()
    tolc.join(octoDiscord.userId)
    await refresh(firstSignIn)

    tolc.refuse()

    expect(await signInAgain(after(2 * hour))).toBe('unknown')
    expect(await refresh(after(3 * hour))).toBe('unknown')
  })

  it('checks right away after Discord is connected again', async () => {
    const { directory, tolc, authUserId, refresh, firstSignIn, after } =
      await connectedMember()
    tolc.join(octoDiscord.userId)
    tolc.refuse()
    await refresh(firstSignIn)

    tolc.accept()
    await directory.connectDiscord({ authUserId, discord: octoDiscord })

    expect(await refresh(after(second))).toBe('in-tolc')
  })

  it('checks again when a different Discord account is connected', async () => {
    const { directory, tolc, authUserId, refresh, firstSignIn, after } =
      await connectedMember()
    tolc.join(octoDiscord.userId)
    await refresh(firstSignIn)

    const otherDiscord = { userId: '41771983423143937', handle: 'other' }
    await directory.connectDiscord({ authUserId, discord: otherDiscord })

    expect(await refresh(after(hour))).toBe('not-in-tolc')
  })

  it('does not check again when the same Discord account is resynced', async () => {
    const { directory, tolc, authUserId, refresh, firstSignIn, after } =
      await connectedMember()
    tolc.join(octoDiscord.userId)
    await refresh(firstSignIn)

    await directory.connectDiscord({
      authUserId,
      discord: { ...octoDiscord, handle: 'octo_renamed' },
    })
    await refresh(after(hour))

    expect(tolc.checks).toBe(1)
  })

  it('has nothing to check before Discord is connected', async () => {
    const { directory, tolc, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('hubot')
    await directory.signIn({ authUserId, githubUsername: 'hubot' })

    const now = new Date()
    expect(
      await directory.refreshMembership({ authUserId, sessionStartedAt: now, now }),
    ).toBe('unknown')
    expect(tolc.checks).toBe(0)
  })
})
