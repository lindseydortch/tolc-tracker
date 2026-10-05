import type { SignedInVisitor } from './signed-in-visitor'

export type LandingPage = '/connect-discord' | '/members-only' | '/signup' | '/'

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
