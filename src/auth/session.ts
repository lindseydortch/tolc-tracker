import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from './auth'
import { directory } from '../directory/app-directory'

export type SignedInVisitor = {
  name: string
  githubUrl: string
}

// The signed-in Member, or null for a signed-out visitor.
export const getSignedInMember = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SignedInVisitor | null> => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session) return null
    const member = await directory.signIn({
      authUserId: session.user.id,
      githubUsername: session.user.githubUsername ?? null,
    })
    return member && { name: session.user.name, githubUrl: member.githubUrl }
  },
)
