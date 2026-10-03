import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '../auth/auth-client'
import { requireSignedInMember } from '../auth/session'
import { useSignOut } from '../auth/use-sign-out'

// Better Auth sends a failed link back here with `?error=<code>`.
const linkErrors: Record<string, string> = {
  account_already_linked_to_different_user:
    'That Discord account is already connected to another Member.',
}

export const Route = createFileRoute('/connect-discord')({
  validateSearch: (search): { error?: string } =>
    typeof search.error === 'string' ? { error: search.error } : {},
  beforeLoad: async () => {
    const member = await requireSignedInMember()
    if (member.discordHandle) throw redirect({ to: '/' })
    return { discordSyncFailed: member.discordSyncFailed }
  },
  component: ConnectDiscord,
})

function ConnectDiscord() {
  const { error } = Route.useSearch()
  const { discordSyncFailed } = Route.useRouteContext()
  const signOut = useSignOut()

  const message = error
    ? (linkErrors[error] ?? 'Discord could not be connected. Try again.')
    : discordSyncFailed
      ? 'Your Discord account is linked, but its details could not be read. Connect again to retry.'
      : null

  return (
    <main>
      <h1>Connect Discord</h1>
      <p>
        The Directory is for TOLC Members only. Connect your Discord account to
        continue.
      </p>
      {message && <p role="alert">{message}</p>}
      <button
        type="button"
        onClick={() =>
          authClient.linkSocial({
            provider: 'discord',
            callbackURL: '/',
            errorCallbackURL: '/connect-discord',
          })
        }
      >
        Connect Discord
      </button>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  )
}
