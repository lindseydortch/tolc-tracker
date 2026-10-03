import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from './auth'
import { syncDiscord } from './discord-sync'
import { directory } from '../directory/app-directory'

export type SignedInVisitor = {
  name: string
  githubUrl: string
  // Null until the Member connects Discord.
  discordHandle: string | null
  // Discord is linked but its handle couldn't be read, so the Member is
  // asked to connect again.
  discordSyncFailed: boolean
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
    let discordSyncFailed = false
    // Linking Discord doesn't start a new session, so the first page load
    // after the Discord redirect records it here.
    if (member && !member.discord) {
      discordSyncFailed = !(await syncDiscord(session.user.id))
      member = await signIn()
    }
    return (
      member && {
        name: session.user.name,
        githubUrl: member.githubUrl,
        discordHandle: member.discord?.handle ?? null,
        discordSyncFailed,
      }
    )
  },
)

// For a route's `beforeLoad`: sends a signed-out visitor to /sign-in.
export async function requireSignedInMember(): Promise<SignedInVisitor> {
  const member = await getSignedInMember()
  if (!member) throw redirect({ to: '/sign-in' })
  return member
}
