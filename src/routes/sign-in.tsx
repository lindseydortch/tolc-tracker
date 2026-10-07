import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '../auth/auth-client'
import { Gate } from '../ui/gate'
import { GitHubMark } from '../ui/marks'

// The line strangers see under the heading. Change the wording here.
const TAGLINE = "If you don't know what this is, it isn't for you."

export const Route = createFileRoute('/sign-in')({
  beforeLoad: async ({ context }) => {
    if (await context.signIn.checkNow()) throw redirect({ to: '/' })
  },
  component: SignIn,
})

function SignIn() {
  return (
    <Gate>
      <h1>TOLC Tracker</h1>
      <p>{TAGLINE}</p>
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
