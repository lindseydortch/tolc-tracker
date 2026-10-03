import { useRouter } from '@tanstack/react-router'
import { authClient } from './auth-client'

// Signs out and returns to /sign-in.
export function useSignOut() {
  const router = useRouter()
  return async () => {
    await authClient.signOut()
    await router.navigate({ to: '/sign-in' })
  }
}
