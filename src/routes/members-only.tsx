import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '../auth/auth-client'
import { discordProviderId } from '../auth/discord-provider'
import { requireSignedInMember } from '../auth/session'
import { useSignOut } from '../auth/use-sign-out'

// Where a signed-in visitor lands when they aren't in TOLC, or when Discord
// gave no answer to trust. Shows no Directory data.
export const Route = createFileRoute('/members-only')({
  beforeLoad: async () => {
    const member = await requireSignedInMember()
    if (!member.discordHandle) throw redirect({ to: '/connect-discord' })
    if (member.membership === 'in-tolc') throw redirect({ to: '/' })
    return { membership: member.membership }
  },
  component: MembersOnly,
})

function MembersOnly() {
  const { membership } = Route.useRouteContext()
  const signOut = useSignOut()

  return (
    <main>
      <h1>TOLC Members only</h1>
      {membership === 'unknown' ? (
        <>
          <p role="alert">
            We couldn't check with Discord that you're in TOLC. Reload the page
            in a minute, or connect Discord again.
          </p>
          <button
            type="button"
            onClick={() =>
              authClient.linkSocial({
                provider: discordProviderId,
                callbackURL: '/',
                errorCallbackURL: '/members-only',
              })
            }
          >
            Connect Discord again
          </button>
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
