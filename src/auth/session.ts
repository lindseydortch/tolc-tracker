import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from './auth'
import { directory } from '../directory/app-directory'

export type SignedInMember = {
  name: string
  githubUrl: string | null
}

// The signed-in Member, or null for a signed-out visitor. Registers the Member
// on first use, which also repairs a sign-in that was interrupted part-way.
export const getSignedInMember = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SignedInMember | null> => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session) return null
    const { id: userId, githubUsername } = session.user
    if (!githubUsername) {
      throw new Error('Signed-in user has no GitHub username')
    }
    await directory.registerMember({ userId, githubUsername })
    const member = await directory.memberForUser(userId)
    if (!member) return null
    return {
      name: session.user.name,
      githubUrl:
        member.links.find((link) => link.kind === 'github')?.url ?? null,
    }
  },
)
