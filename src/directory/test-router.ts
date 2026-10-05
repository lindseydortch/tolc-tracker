import {
  Link,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { createElement } from 'react'
import { createSignInCache } from '../auth/sign-in-cache'
import { visitorInDirectory } from '../auth/test-visitors'
import { preloadOptions } from '../preload'

// A router with the app's preload options over a Directory and a Member
// profile page whose loaders read `saved`, standing in for the database, and
// an editor page that changes it and links to the Directory. `fetches` counts
// loader runs, standing in for server fetches, and `signInChecks` counts
// sign-in checks, which always find a Member who belongs in the Directory.
// Navigating needs a DOM, so tests using this run under happy-dom.
export function testRouter(initialPath = '/') {
  const db = { saved: 'old', fetches: 0, signInChecks: 0 }
  const signIn = createSignInCache(async () => {
    db.signInChecks++
    return visitorInDirectory
  })
  const loadSaved = async () => {
    db.fetches++
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
  const editor = createRoute({
    getParentRoute: () => rootRoute,
    path: '/edit-profile',
    component: () => createElement(Link, { to: '/' }, 'Directory'),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([directory, profile, editor]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    ...preloadOptions,
    context: { signIn },
  })
  // In the app, RouterProvider does this.
  router.history.subscribe(() => router.load())
  const shownAt = (pathname: string) => {
    const page = router.state.matches.at(-1)
    return page?.pathname === pathname ? page.loaderData : undefined
  }
  const shownOnDirectory = () => shownAt('/')
  const shownOnProfile = () => shownAt('/members/1')
  return { db, router, signIn, shownOnDirectory, shownOnProfile }
}
