// The router only navigates with a DOM.
// @vitest-environment happy-dom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reloadAfterChange } from './directory/reload-after-change'
import { PRELOAD_STALE_TIME_MS, preloadOptions } from './preload'

afterEach(() => {
  vi.useRealTimers()
})

// A start page and a Directory whose loader counts its server fetches and
// reads `saved`, standing in for the database.
function testApp() {
  const db = { saved: 'old', fetches: 0 }
  const rootRoute = createRootRoute()
  const start = createRoute({ getParentRoute: () => rootRoute, path: '/edit-profile' })
  const directory = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    loader: () => {
      db.fetches++
      return db.saved
    },
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([start, directory]),
    history: createMemoryHistory({ initialEntries: ['/edit-profile'] }),
    ...preloadOptions,
  })
  // In the app, RouterProvider does this.
  router.history.subscribe(() => router.load())
  const shownOnDirectory = () => {
    const page = router.state.matches.at(-1)
    return page?.pathname === '/' ? page.loaderData : undefined
  }
  return { db, router, shownOnDirectory }
}

describe('preloadOptions', () => {
  it('renders a click right after a hover from the hover preload', async () => {
    const { db, router, shownOnDirectory } = testApp()
    await router.load()

    await router.preloadRoute({ to: '/' })
    await router.navigate({ to: '/' })

    expect(db.fetches).toBe(1)
    expect(shownOnDirectory()).toBe('old')
  })

  it('refetches when the click comes long after the hover', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { db, router, shownOnDirectory } = testApp()
    await router.load()

    await router.preloadRoute({ to: '/' })
    db.saved = 'new'
    vi.setSystemTime(Date.now() + PRELOAD_STALE_TIME_MS)
    await router.navigate({ to: '/' })

    expect(db.fetches).toBe(2)
    await vi.waitFor(() => expect(shownOnDirectory()).toBe('new'))
  })

  it('refetches a hover preload after a profile save or an Admin action', async () => {
    const { db, router, shownOnDirectory } = testApp()
    await router.load()

    await router.preloadRoute({ to: '/' })
    db.saved = 'new'
    await reloadAfterChange(router)
    await router.navigate({ to: '/' })

    expect(shownOnDirectory()).toBe('new')
  })
})
