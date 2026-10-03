import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  ConnectDiscordButton,
  linkErrorMessage,
  validateLinkSearch,
} from '../auth/connect-discord-button'
import { landingPage, requireSignedInMember } from '../auth/session'
import { useSignOut } from '../auth/use-sign-out'

// Where a signed-in visitor lands when they aren't in TOLC, or when Discord
// gave no answer to trust. Shows no Directory data.
export const Route = createFileRoute('/members-only')({
  validateSearch: validateLinkSearch,
  beforeLoad: async () => {
    const member = await requireSignedInMember()
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
    <main>
      <h1>TOLC Members only</h1>
      {error && <p role="alert">{linkErrorMessage(error)}</p>}
      {membership === 'unknown' ? (
        <>
          <p role="alert">
            We couldn't check with Discord that you're in TOLC. Reload the page
            in a minute, or connect Discord again.
          </p>
          <ConnectDiscordButton returnTo="/members-only">
            Connect Discord again
          </ConnectDiscordButton>
        </>
      ) : (
        <p>
          The Directory is only for people in the TOLC Discord server. Join
          TOLC, then reload this page.
        </p>
      )}
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  )
}
