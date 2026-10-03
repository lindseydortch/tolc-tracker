import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  ConnectDiscordButton,
  linkErrorMessage,
  validateLinkSearch,
} from '../auth/connect-discord-button'
import { landingPage, requireSignedInMember } from '../auth/session'
import { useSignOut } from '../auth/use-sign-out'

export const Route = createFileRoute('/connect-discord')({
  validateSearch: validateLinkSearch,
  beforeLoad: async () => {
    const member = await requireSignedInMember()
    const page = landingPage(member)
    if (page !== '/connect-discord') throw redirect({ to: page })
    return { discordSyncFailed: member.discordSyncFailed }
  },
  component: ConnectDiscord,
})

function ConnectDiscord() {
  const { error } = Route.useSearch()
  const { discordSyncFailed } = Route.useRouteContext()
  const signOut = useSignOut()

  const message = error
    ? linkErrorMessage(error)
    : discordSyncFailed
      ? 'Your Discord account is linked, but its details could not be ' +
        'read. Connect again to retry.'
      : null

  return (
    <main>
      <h1>Connect Discord</h1>
      <p>
        The Directory is for TOLC Members only. Connect your Discord account to
        continue.
      </p>
      {message && <p role="alert">{message}</p>}
      <ConnectDiscordButton returnTo="/connect-discord">
        Connect Discord
      </ConnectDiscordButton>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  )
}
