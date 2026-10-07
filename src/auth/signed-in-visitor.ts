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
  // Only someone 'in-tolc' may see Directory data (ADR 0001, ADR 0003).
  membership: Membership
  // False until the Member has sent the signup form. Only worked out for
  // someone 'in-tolc', since no one else can reach the form.
  profileComplete: boolean
  // False from signup until the Member first opens Edit Profile, while its
  // nav link carries a dot. Only worked out for someone 'in-tolc'.
  editProfileSeen: boolean
  // Only the Admin can merge Catalog entries and hide or delete Members.
  isAdmin: boolean
}

// Server-only: reads the current request's session. Null for a signed-out
// visitor. Import it only inside server function handlers.
export async function loadSignedInVisitor(): Promise<{
  authUserId: string
  visitor: SignedInVisitor
} | null> {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) return null
  const authUserId = session.user.id
  const signIn = () =>
    directory.signIn({
      authUserId,
      githubUsername: session.user.githubUsername ?? null,
    })
  let member = await signIn()
  if (!member) return null
  let discordSyncFailed = false
  const linked = await findLinkedDiscordAccount(authUserId)
  // A failed sync leaves the sync time old, so the next page load retries.
  if (
    linked &&
    isDiscordSyncDue({
      syncedAt: member.discordSyncedAt,
      sessionStartedAt: session.session.createdAt,
      linkedAt: linked.updatedAt,
      now: new Date(),
    })
  ) {
    discordSyncFailed = (await syncDiscord(linked)) === 'failed'
    member = await signIn()
  }
  if (!member) return null
  const membership = await directory.checkMembership({ authUserId })
  // Only worked out for someone 'in-tolc'; false for everyone else.
  const ifInTolc = (ask: (authUserId: string) => Promise<boolean>) =>
    membership === 'in-tolc' ? ask(authUserId) : Promise.resolve(false)
  const [profileComplete, editProfileSeen, isAdmin] = await Promise.all([
    ifInTolc(directory.isProfileComplete),
    ifInTolc(directory.hasSeenEditProfile),
    ifInTolc(directory.isAdmin),
  ])
  return {
    authUserId,
    visitor: {
      name: session.user.name,
      githubUrl: member.githubUrl,
      discordHandle: member.discord?.handle ?? null,
      discordSyncFailed,
      membership,
      profileComplete,
      editProfileSeen,
      isAdmin,
    },
  }
}
