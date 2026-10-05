import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  ConnectDiscordButton,
  linkErrorMessage,
  validateLinkSearch,
} from '../auth/connect-discord-button'
import { landingPage, requireSignedInMember } from '../auth/session'
import { useSignOut } from '../auth/use-sign-out'
import { Gate } from '../ui/gate'
import { Alert } from '../ui/alert'

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
    <Gate>
      <h1>Connect Discord</h1>
      <p>
        The Directory is for TOLC Members only. Connect your Discord account to
        continue.
      </p>
      {message && <Alert>{message}</Alert>}
      <div className="gate-actions">
        <ConnectDiscordButton returnTo="/connect-discord">
          Connect Discord
        </ConnectDiscordButton>
        <button type="button" className="btn-quiet btn-lg" onClick={signOut}>
          Sign out
        </button>
      </div>
    </Gate>
  )
}
