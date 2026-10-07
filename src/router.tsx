import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { getSignedInMember } from './auth/session'
import { createSignInCache } from './auth/sign-in-cache'
import { createFinishProfilePrompt } from './directory/finish-profile-prompt'
import { preloadOptions } from './preload'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    // One per router: the server makes a router for each request, so a
    // sign-in check is never shared between visitors.
    context: {
      signIn: createSignInCache(getSignedInMember),
      finishProfilePrompt: createFinishProfilePrompt(),
    },
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
