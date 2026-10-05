import type { ReactNode } from 'react'
import { authClient } from './auth-client'
import { DiscordMark } from '../ui/marks'
import { discordProviderId } from './discord-provider'

// Better Auth sends a failed link back to the page it started from with
// `?error=<code>`.
const linkErrors: Record<string, string> = {
  account_already_linked_to_different_user:
    'That Discord account is already connected to another Member.',
}

export function linkErrorMessage(code: string): string {
  return linkErrors[code] ?? 'Discord could not be connected. Try again.'
}

// For a route's `validateSearch`: keeps the `?error=<code>` of a failed link.
export function validateLinkSearch(
  search: Record<string, unknown>,
): { error?: string } {
  return typeof search.error === 'string' ? { error: search.error } : {}
}

// Starts linking Discord, then returns to / or, on failure, to `returnTo`.
export function ConnectDiscordButton({
  returnTo,
  children,
}: {
  returnTo: '/connect-discord' | '/members-only'
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="btn-primary btn-lg"
      onClick={() =>
        authClient.linkSocial({
          provider: discordProviderId,
          callbackURL: '/',
          errorCallbackURL: returnTo,
        })
      }
    >
      <DiscordMark size={18} />
      {children}
    </button>
  )
}
