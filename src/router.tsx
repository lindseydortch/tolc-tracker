import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { preloadOptions } from './preload'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    ...preloadOptions,
    // `/members/1/extra` gets the root's not-found page, not the profile's.
    notFoundMode: 'root',
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
