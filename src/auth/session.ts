import { redirect } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { landingPage, type LandingPage } from './landing-page'
import { loadSignedInVisitor, type SignedInVisitor } from './signed-in-visitor'

export type { SignedInVisitor } from './signed-in-visitor'

// The signed-in Member, or null for a signed-out visitor.
export const getSignedInMember = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SignedInVisitor | null> =>
    (await loadSignedInVisitor())?.visitor ?? null,
)

// For a route's `beforeLoad`: sends a signed-out visitor to /sign-in.
export function requireSignedInMember(
  member: SignedInVisitor | null,
): SignedInVisitor {
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
