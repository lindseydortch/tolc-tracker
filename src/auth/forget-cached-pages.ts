import type { AnyRouter } from '@tanstack/react-router'
import type { RouterContext } from '../router-context'

// The parts of the router `forgetCachedPages` uses. The app's router
// declares the `RouterContext`, so this needs no cast.
type RouterWithSignIn = Pick<AnyRouter, 'clearCache'> & {
  options: { context: RouterContext }
}

// Drops every page's cached data and the last sign-in check, so the next
// page asks the server for both.
export function forgetCachedPages(router: RouterWithSignIn) {
  router.options.context.signIn.clear()
  router.clearCache()
}
