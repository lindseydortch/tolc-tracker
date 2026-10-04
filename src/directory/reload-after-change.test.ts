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

// A Directory whose loader reads `saved`, standing in for the database,
// and an editor page that changes it.
function testApp() {
  const db = { saved: 'old' }
  const rootRoute = createRootRoute()
  const directory = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    loader: async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return db.saved
    },
  })
  const editor = createRoute({ getParentRoute: () => rootRoute, path: '/edit-profile' })
  const router = createRouter({
    routeTree: rootRoute.addChildren([directory, editor]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  // In the app, RouterProvider does this.
  router.history.subscribe(() => router.load())
  const shownOnDirectory = () => {
    const page = router.state.matches.at(-1)
    return page?.pathname === '/' ? page.loaderData : undefined
  }
  return { db, router, shownOnDirectory }
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
