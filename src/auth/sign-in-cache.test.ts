import { describe, expect, it } from 'vitest'
import type { SignedInVisitor } from './signed-in-visitor'
import { SIGN_IN_REUSE_MS, createSignInCache } from './sign-in-cache'
import { visitorInDirectory as inDirectory } from './test-visitors'

const onSignup: SignedInVisitor = { ...inDirectory, profileComplete: false }
const hidden: SignedInVisitor = { ...inDirectory, membership: 'hidden' }

// A cache over a fake server check that answers `answer` and counts its
// calls, with a clock the test moves.
function cacheOver(answer: SignedInVisitor | null) {
  const server = { answer, checks: 0 }
  let time = 0
  const cache = createSignInCache(
    async () => {
      server.checks++
      return server.answer
    },
    () => time,
  )
  const advance = (ms: number) => {
    time += ms
  }
  return { cache, server, advance }
}

describe('createSignInCache', () => {
  it('reuses a recent check of a Member who belongs in the Directory', async () => {
    const { cache, server } = cacheOver(inDirectory)

    await cache.checkRecent()
    const member = await cache.checkRecent()

    expect(member).toEqual(inDirectory)
    expect(server.checks).toBe(1)
  })

  it('shares a check still in flight, so a click right after a hover waits on one', async () => {
    const { cache, server } = cacheOver(inDirectory)

    const [hover, click] = await Promise.all([cache.checkRecent(), cache.checkRecent()])

    expect(hover).toEqual(inDirectory)
    expect(click).toEqual(inDirectory)
    expect(server.checks).toBe(1)
  })

  it('asks the server again once the last check is too old to reuse', async () => {
    const { cache, server, advance } = cacheOver(inDirectory)

    await cache.checkRecent()
    server.answer = hidden
    advance(SIGN_IN_REUSE_MS + 1)
    const member = await cache.checkRecent()

    expect(member).toEqual(hidden)
    expect(server.checks).toBe(2)
  })

  it('never reuses a signed-out answer', async () => {
    const { cache, server } = cacheOver(null)

    await cache.checkRecent()
    server.answer = inDirectory
    const member = await cache.checkRecent()

    expect(member).toEqual(inDirectory)
    expect(server.checks).toBe(2)
  })

  it('never reuses a Member who belongs on another page, so finishing signup reaches the Directory', async () => {
    const { cache, server } = cacheOver(onSignup)

    await cache.checkRecent()
    server.answer = inDirectory
    const member = await cache.checkRecent()

    expect(member).toEqual(inDirectory)
    expect(server.checks).toBe(2)
  })

  it('always asks the server for a fresh check', async () => {
    const { cache, server } = cacheOver(inDirectory)

    await cache.checkRecent()
    await cache.checkNow()

    expect(server.checks).toBe(2)
  })

  it('drops the reusable check when a fresh one finds the Member now belongs elsewhere', async () => {
    const { cache, server } = cacheOver(inDirectory)

    await cache.checkRecent()
    server.answer = hidden
    await cache.checkNow()
    const member = await cache.checkRecent()

    expect(member).toEqual(hidden)
    expect(server.checks).toBe(3)
  })

  it('asks the server again after being cleared, as on sign-out', async () => {
    const { cache, server } = cacheOver(inDirectory)

    await cache.checkRecent()
    server.answer = null
    cache.clear()
    const member = await cache.checkRecent()

    expect(member).toBeNull()
    expect(server.checks).toBe(2)
  })

  it("doesn't keep a check that was in flight when the cache was cleared", async () => {
    const { cache, server } = cacheOver(inDirectory)

    const inFlight = cache.checkRecent()
    cache.clear()
    await inFlight
    server.answer = null
    const member = await cache.checkRecent()

    expect(member).toBeNull()
    expect(server.checks).toBe(2)
  })

  it("reuses a Member it was told about, as when the page loaded with the server's check", async () => {
    const { cache, server } = cacheOver(hidden)

    cache.remember(inDirectory)
    const member = await cache.checkRecent()

    expect(member).toEqual(inDirectory)
    expect(server.checks).toBe(0)
  })

  it("doesn't replace a check it already holds with one it's told about", async () => {
    const { cache, server } = cacheOver(inDirectory)

    await cache.checkRecent()
    cache.remember(hidden)
    const member = await cache.checkRecent()

    expect(member).toEqual(inDirectory)
    expect(server.checks).toBe(1)
  })

  it('asks the server again after a failed check', async () => {
    let checks = 0
    const cache = createSignInCache(async () => {
      checks++
      if (checks === 1) throw new Error('network down')
      return inDirectory
    })

    await expect(cache.checkRecent()).rejects.toThrow('network down')
    const member = await cache.checkRecent()

    expect(member).toEqual(inDirectory)
    expect(checks).toBe(2)
  })

  it('reuses a check with Edit Profile marked seen, without asking the server', async () => {
    const { cache, server } = cacheOver({ ...inDirectory, editProfileSeen: false })

    await cache.checkRecent()
    cache.sawEditProfile()
    const member = await cache.checkRecent()

    expect(member?.editProfileSeen).toBe(true)
    expect(server.checks).toBe(1)
  })

  it('marks Edit Profile seen on a check still in flight', async () => {
    const { cache } = cacheOver({ ...inDirectory, editProfileSeen: false })

    const inFlight = cache.checkRecent()
    cache.sawEditProfile()
    await inFlight

    expect((await cache.checkRecent())?.editProfileSeen).toBe(true)
  })
})
