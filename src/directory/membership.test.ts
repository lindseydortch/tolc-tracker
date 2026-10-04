import { describe, expect, it } from 'vitest'
import { createTestSetup } from './test-directory'

const octoDiscord = { userId: '80351110224678912', handle: 'octo_discord' }
const second = 1000
const hour = 60 * 60 * second

// A Member signed in with GitHub and connected to Discord. `check` loads a
// page at `now`; `after` gives a time that long after the first page load.
async function connectedMember() {
  const setup = await createTestSetup()
  const authUserId = await setup.signUpWithGitHub('octocat')
  await setup.directory.signIn({ authUserId, githubUsername: 'octocat' })
  await setup.directory.connectDiscord({ authUserId, discord: octoDiscord })
  const firstLoad = new Date('2026-10-01T09:00:00Z')
  const after = (ms: number) => new Date(firstLoad.getTime() + ms)
  const check = (now: Date) =>
    setup.directory.checkMembership({ authUserId, now })
  return { ...setup, authUserId, firstLoad, after, check }
}

describe('the TOLC membership check', () => {
  it('lets in a Member who is in TOLC', async () => {
    const { tolc, check, firstLoad } = await connectedMember()
    tolc.join(octoDiscord.userId)

    expect(await check(firstLoad)).toBe('in-tolc')
  })

  it('keeps out someone who is not in TOLC, without hiding them', async () => {
    const { directory, authUserId, check, firstLoad } = await connectedMember()

    expect(await check(firstLoad)).toBe('not-in-tolc')
    expect((await directory.memberForAuthUser(authUserId))?.hidden).toBe(false)
  })

  it('never checks again once the Member has passed', async () => {
    const { tolc, check, firstLoad, after } = await connectedMember()
    tolc.join(octoDiscord.userId)
    await check(firstLoad)

    tolc.leave(octoDiscord.userId)

    expect(await check(after(hour))).toBe('in-tolc')
    expect(await check(after(48 * hour))).toBe('in-tolc')
    expect(tolc.checks).toBe(1)
  })

  it('keeps checking, at most twice a minute, until the Member passes', async () => {
    const { tolc, check, firstLoad, after } = await connectedMember()
    await check(firstLoad)

    tolc.join(octoDiscord.userId)

    expect(await check(after(29 * second))).toBe('not-in-tolc')
    expect(tolc.checks).toBe(1)
    expect(await check(after(30 * second))).toBe('in-tolc')
    expect(tolc.checks).toBe(2)
  })

  it('reports no answer while Discord is unavailable, then retries', async () => {
    const { tolc, check, firstLoad, after } = await connectedMember()
    tolc.join(octoDiscord.userId)
    tolc.goDown()
    expect(await check(firstLoad)).toBe('unknown')

    tolc.comeBack()

    expect(await check(after(29 * second))).toBe('unknown')
    expect(await check(after(30 * second))).toBe('in-tolc')
  })

  it('keeps the last "not in TOLC" while Discord is unavailable', async () => {
    const { tolc, check, firstLoad, after } = await connectedMember()
    await check(firstLoad)

    tolc.goDown()

    expect(await check(after(30 * second))).toBe('not-in-tolc')
  })

  it('reports no answer once Discord refuses to answer', async () => {
    const { tolc, check, firstLoad, after } = await connectedMember()
    await check(firstLoad)

    tolc.refuse()

    expect(await check(after(30 * second))).toBe('unknown')
  })

  it('does not ask Discord once passed, even if it would refuse', async () => {
    const { tolc, check, firstLoad, after } = await connectedMember()
    tolc.join(octoDiscord.userId)
    await check(firstLoad)

    tolc.refuse()

    expect(await check(after(hour))).toBe('in-tolc')
  })

  it('checks right away after Discord is connected again', async () => {
    const { directory, tolc, authUserId, check, firstLoad, after } =
      await connectedMember()
    tolc.join(octoDiscord.userId)
    tolc.refuse()
    await check(firstLoad)

    tolc.comeBack()
    await directory.connectDiscord({ authUserId, discord: octoDiscord })

    expect(await check(after(second))).toBe('in-tolc')
  })

  it('needs a fresh pass when a different Discord account is connected', async () => {
    const { directory, tolc, authUserId, check, firstLoad, after } =
      await connectedMember()
    tolc.join(octoDiscord.userId)
    await check(firstLoad)

    const otherDiscord = { userId: '41771983423143937', handle: 'other' }
    await directory.connectDiscord({ authUserId, discord: otherDiscord })

    expect(await check(after(hour))).toBe('not-in-tolc')
    tolc.join(otherDiscord.userId)
    expect(await check(after(hour + 30 * second))).toBe('in-tolc')
  })

  it('does not check again when the same Discord account is resynced', async () => {
    const { directory, tolc, authUserId, check, firstLoad, after } =
      await connectedMember()
    tolc.join(octoDiscord.userId)
    await check(firstLoad)

    await directory.connectDiscord({
      authUserId,
      discord: { ...octoDiscord, handle: 'octo_renamed' },
    })

    expect(await check(after(hour))).toBe('in-tolc')
    expect(tolc.checks).toBe(1)
  })

  it('has nothing to check before Discord is connected', async () => {
    const { directory, tolc, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('hubot')
    await directory.signIn({ authUserId, githubUsername: 'hubot' })

    expect(await directory.checkMembership({ authUserId })).toBe('unknown')
    expect(tolc.checks).toBe(0)
  })
})
