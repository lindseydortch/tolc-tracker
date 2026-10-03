import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '../auth/auth-client'
import { getSignedInMember } from '../auth/session'

export const Route = createFileRoute('/sign-in')({
  beforeLoad: async () => {
    if (await getSignedInMember()) throw redirect({ to: '/' })
  },
  component: SignIn,
})

function SignIn() {
  return (
    <main>
      <h1>TOLC Tracker</h1>
      <p>The Directory of the Offer Letter Club.</p>
      <button
        type="button"
        onClick={() =>
          authClient.signIn.social({ provider: 'github', callbackURL: '/' })
        }
      >
        Sign in with GitHub
      </button>
    </main>
  )
}
