import { useRouter, type AnyRouter } from '@tanstack/react-router'
import { forgetCachedPages } from '../auth/forget-cached-pages'

// Reloads the current page after a change on the server (a profile edit or
// an Admin action), and drops every other page's cached data.
// `invalidate()` alone only marks cached pages stale, and the router shows
// stale pages first while it reloads them in the background: going back to
// the Directory would flash the old card. A page with no cached data waits
// for its loader instead.
export async function reloadAfterChange(router: AnyRouter) {
  forgetCachedPages(router)
  await router.invalidate()
}

export function useReloadAfterChange() {
  const router = useRouter()
  return () => reloadAfterChange(router)
}
