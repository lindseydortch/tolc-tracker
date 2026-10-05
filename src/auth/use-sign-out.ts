import { useRouter } from '@tanstack/react-router'
import { authClient } from './auth-client'
import { forgetCachedPages } from './forget-cached-pages'

// Signs out and returns to /sign-in. Forgets the sign-in check and every
// cached page. The page being left is cached again as the router leaves
// it, so what keeps Back from showing it is the Member pages' `beforeLoad`:
// it runs before anything renders, finds no recent check, asks the server
// and redirects to /sign-in.
export function useSignOut() {
  const router = useRouter()
  return async () => {
    await authClient.signOut()
    forgetCachedPages(router)
    await router.navigate({ to: '/sign-in' })
  }
}
