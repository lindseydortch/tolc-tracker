// The router only navigates with a DOM.
// @vitest-environment happy-dom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { reloadAfterChange } from './reload-after-change'

// A Directory and a Member profile page whose loaders read `saved`,
// standing in for the database, and an editor page that changes it.
function testApp() {
  const db = { saved: 'old' }
  const loadSaved = async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
    return db.saved
  }
  const rootRoute = createRootRoute()
  const directory = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    loader: loadSaved,
  })
  const profile = createRoute({
    getParentRoute: () => rootRoute,
    path: '/members/$memberId',
    loader: loadSaved,
  })
  const editor = createRoute({ getParentRoute: () => rootRoute, path: '/edit-profile' })
  const router = createRouter({
    routeTree: rootRoute.addChildren([directory, profile, editor]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  // In the app, RouterProvider does this.
  router.history.subscribe(() => router.load())
  const shownAt = (pathname: string) => {
    const page = router.state.matches.at(-1)
    return page?.pathname === pathname ? page.loaderData : undefined
  }
  const shownOnDirectory = () => shownAt('/')
  const shownOnProfile = () => shownAt('/members/1')
  return { db, router, shownOnDirectory, shownOnProfile }
}

describe('reloadAfterChange', () => {
  it('makes the Directory show the saved data on first render after an edit', async () => {
    const { db, router, shownOnDirectory } = testApp()
    await router.load()
    await router.navigate({ to: '/edit-profile' })

    db.saved = 'new'
    await reloadAfterChange(router)
    await router.navigate({ to: '/' })

    expect(shownOnDirectory()).toBe('new')
  })

  it('makes the Member profile page show the saved data on first render after an edit', async () => {
    const { db, router, shownOnProfile } = testApp()
    await router.load()
    await router.navigate({ to: '/members/$memberId', params: { memberId: '1' } })
    await router.navigate({ to: '/edit-profile' })

    db.saved = 'new'
    await reloadAfterChange(router)
    await router.navigate({ to: '/members/$memberId', params: { memberId: '1' } })

    expect(shownOnProfile()).toBe('new')
  })

  it('drops a Directory preloaded before the edit', async () => {
    const { db, router, shownOnDirectory } = testApp()
    await router.load()
    await router.navigate({ to: '/edit-profile' })
    await router.preloadRoute({ to: '/' })

    db.saved = 'new'
    await reloadAfterChange(router)
    await router.navigate({ to: '/' })

    expect(shownOnDirectory()).toBe('new')
  })

  it('leaves a return to the Directory without an edit showing cached data at once', async () => {
    const { db, router, shownOnDirectory } = testApp()
    await router.load()
    await router.navigate({ to: '/edit-profile' })

    db.saved = 'new'
    await router.navigate({ to: '/' })

    expect(shownOnDirectory()).toBe('old')
  })
})
