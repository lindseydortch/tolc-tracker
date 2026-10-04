import { redirect } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { loadSignedInVisitor, type SignedInVisitor } from './signed-in-visitor'

export type { SignedInVisitor } from './signed-in-visitor'

export type LandingPage = '/connect-discord' | '/members-only' | '/signup' | '/'

// The signed-in Member, or null for a signed-out visitor.
export const getSignedInMember = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SignedInVisitor | null> =>
    (await loadSignedInVisitor())?.visitor ?? null,
)

// The only page a signed-in visitor may be on: the Members-only notice for
// a Hidden Member, Connect Discord until Discord is connected, the
// Members-only notice unless they're in TOLC, the signup form until their
// profile is complete, and the Directory otherwise.
export function landingPage(member: SignedInVisitor): LandingPage {
  if (member.membership === 'hidden') return '/members-only'
  if (!member.discordHandle) return '/connect-discord'
  if (member.membership !== 'in-tolc') return '/members-only'
  if (!member.profileComplete) return '/signup'
  return '/'
}

// For a route's `beforeLoad`: sends a signed-out visitor to /sign-in.
export async function requireSignedInMember(): Promise<SignedInVisitor> {
  const member = await getSignedInMember()
  if (!member) throw redirect({ to: '/sign-in' })
  return member
}

// For server function handlers: the signed-in Member's auth user ID, if
// `page` is where they belong. Otherwise redirects them where they do
// belong, so Directory data never reaches anyone the gate would send
// elsewhere, even if their membership changed since the route's
// `beforeLoad` ran.
export const requireLandingPage = createServerOnlyFn(
  async (page: LandingPage): Promise<string> => {
    const signedIn = await loadSignedInVisitor()
    if (!signedIn) throw redirect({ to: '/sign-in' })
    const belongsOn = landingPage(signedIn.visitor)
    if (belongsOn !== page) throw redirect({ to: belongsOn })
    return signedIn.authUserId
  },
)
