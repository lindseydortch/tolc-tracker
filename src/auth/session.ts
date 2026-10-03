import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from './auth'
import { findLinkedDiscordAccount } from './discord-api'
import { syncDiscord } from './discord-sync'
import { directory } from '../directory/app-directory'
import { isDiscordSyncDue, type Membership } from '../directory/directory'

export type SignedInVisitor = {
  name: string
  githubUrl: string
  // Null until the Member connects Discord.
  discordHandle: string | null
  // Discord is linked but its handle couldn't be read, so the Member is
  // asked to connect again.
  discordSyncFailed: boolean
  // Only someone 'in-tolc' may see Directory data (ADR 0001).
  membership: Membership
}

// The signed-in Member, or null for a signed-out visitor.
export const getSignedInMember = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SignedInVisitor | null> => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session) return null
    const signIn = () =>
      directory.signIn({
        authUserId: session.user.id,
        githubUsername: session.user.githubUsername ?? null,
      })
    let member = await signIn()
    if (!member) return null
    let discordSyncFailed = false
    const linked = await findLinkedDiscordAccount(session.user.id)
    // A failed sync leaves the sync time old, so the next page load retries.
    if (
      linked &&
      isDiscordSyncDue({
        syncedAt: member.discordSyncedAt,
        sessionStartedAt: session.session.createdAt,
        linkedAt: linked.updatedAt,
      })
    ) {
      discordSyncFailed = (await syncDiscord(linked)) === 'failed'
      member = await signIn()
    }
    if (!member) return null
    return {
      name: session.user.name,
      githubUrl: member.githubUrl,
      discordHandle: member.discord?.handle ?? null,
      discordSyncFailed,
      membership: await directory.refreshMembership({
        authUserId: session.user.id,
        sessionStartedAt: session.session.createdAt,
      }),
    }
  },
)

// The only page a signed-in visitor may be on: Connect Discord until
// Discord is connected, the Members-only notice unless they're in TOLC, and
// the Directory otherwise.
export function landingPage(
  member: SignedInVisitor,
): '/connect-discord' | '/members-only' | '/' {
  if (!member.discordHandle) return '/connect-discord'
  if (member.membership !== 'in-tolc') return '/members-only'
  return '/'
}

// For a route's `beforeLoad`: sends a signed-out visitor to /sign-in.
export async function requireSignedInMember(): Promise<SignedInVisitor> {
  const member = await getSignedInMember()
  if (!member) throw redirect({ to: '/sign-in' })
  return member
}
