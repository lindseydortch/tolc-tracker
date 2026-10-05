import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  ConnectDiscordButton,
  linkErrorMessage,
  validateLinkSearch,
} from '../auth/connect-discord-button'
import { landingPage } from '../auth/landing-page'
import { requireSignedInMember } from '../auth/session'
import { useSignOut } from '../auth/use-sign-out'
import { Gate } from '../ui/gate'
import { Alert } from '../ui/alert'

// Where a signed-in visitor lands when they aren't in TOLC, when the Admin
// has hidden them, or when Discord gave no answer to trust. Shows no
// Directory data.
export const Route = createFileRoute('/members-only')({
  validateSearch: validateLinkSearch,
  beforeLoad: async ({ context }) => {
    const member = requireSignedInMember(await context.signIn.fresh())
    const page = landingPage(member)
    if (page !== '/members-only') throw redirect({ to: page })
    return { membership: member.membership }
  },
  component: MembersOnly,
})

function MembersOnly() {
  const { error } = Route.useSearch()
  const { membership } = Route.useRouteContext()
  const signOut = useSignOut()

  return (
    <Gate>
      <h1>TOLC Members only</h1>
      {error && <Alert>{linkErrorMessage(error)}</Alert>}
      {membership === 'unknown' ? (
        <>
          <Alert>
            We couldn't check with Discord that you're in TOLC. Reload the page
            in a minute, or connect Discord again.
          </Alert>
          <div className="gate-actions">
            <ConnectDiscordButton returnTo="/members-only">
              Connect Discord again
            </ConnectDiscordButton>
          </div>
        </>
      ) : (
        <p>Please contact the Discord admin for the TOLC server.</p>
      )}
      <div className="gate-actions">
        <button type="button" className="btn-quiet btn-lg" onClick={signOut}>
          Sign out
        </button>
      </div>
    </Gate>
  )
}
