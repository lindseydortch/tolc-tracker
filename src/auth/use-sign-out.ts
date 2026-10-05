import { useRouter } from '@tanstack/react-router'
import { forgetCachedPages } from '../directory/reload-after-change'
import { authClient } from './auth-client'

// Signs out and returns to /sign-in. Forgets the sign-in check and every
// cached page, so going back to a Member page asks the server again.
export function useSignOut() {
  const router = useRouter()
  return async () => {
    await authClient.signOut()
    forgetCachedPages(router)
    await router.navigate({ to: '/sign-in' })
  }
}
