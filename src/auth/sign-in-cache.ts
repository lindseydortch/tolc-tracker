import { landingPage } from './landing-page'
import type { SignedInVisitor } from './signed-in-visitor'

// How long the Member pages reuse a sign-in check instead of asking the
// server on every page change. Their server functions check access again
// (`requireLandingPage`), so a Member who is hidden or signed out meanwhile
// is still redirected by the first one a page calls.
export const SIGN_IN_REUSE_MS = 5 * 60_000

export type SignInCache = ReturnType<typeof createSignInCache>

// The router's context: every route can reach the sign-in check.
export type RouterContext = { signIn: SignInCache }

// Remembers the last sign-in check, so a click after a hover preload, or
// the next page change, doesn't wait on another round trip. It only keeps
// a Member who belongs in the Directory: anyone the gate sends elsewhere is
// checked again every time, so finishing signup or being hidden takes
// effect on the next page change.
export function createSignInCache(
  check: () => Promise<SignedInVisitor | null>,
  now: () => number = Date.now,
) {
  let lastCheck:
    | { checkedAt: number; member: Promise<SignedInVisitor | null> }
    | undefined

  const fresh = () => {
    const entry = { checkedAt: now(), member: check() }
    lastCheck = entry
    const forget = () => {
      if (lastCheck === entry) lastCheck = undefined
    }
    entry.member.then(
      (member) => {
        if (!member || landingPage(member) !== '/') forget()
      },
      forget,
    )
    return entry.member
  }

  return {
    // For the gate pages: always asks the server.
    fresh,
    // For the Member pages: reuses a check from the last `SIGN_IN_REUSE_MS`,
    // including one still in flight.
    recent: () =>
      lastCheck && now() - lastCheck.checkedAt <= SIGN_IN_REUSE_MS
        ? lastCheck.member
        : fresh(),
    // On sign-out, a profile save or an Admin action.
    clear: () => {
      lastCheck = undefined
    },
  }
}
