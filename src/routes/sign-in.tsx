import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '../auth/auth-client'
import { Gate } from '../ui/gate'
import { GitHubMark } from '../ui/marks'

export const Route = createFileRoute('/sign-in')({
  beforeLoad: async ({ context }) => {
    if (await context.signIn.fresh()) throw redirect({ to: '/' })
  },
  component: SignIn,
})

function SignIn() {
  return (
    <Gate>
      <h1>TOLC Tracker</h1>
      <p>The Directory of the Offer Letter Club.</p>
      <div className="gate-actions">
        <button
          type="button"
          className="btn-primary btn-lg"
          onClick={() =>
            authClient.signIn.social({ provider: 'github', callbackURL: '/' })
          }
        >
          <GitHubMark size={18} />
          Sign in with GitHub
        </button>
      </div>
    </Gate>
  )
}
