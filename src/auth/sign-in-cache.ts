import { landingPage } from './landing-page'
import type { SignedInVisitor } from './signed-in-visitor'

// How long the Member pages reuse a sign-in check instead of asking the
// server on every page change. Their server functions check access again
// (`requireLandingPage`), so a Member who is hidden or signed out meanwhile
// is still redirected by the first one a page calls.
export const SIGN_IN_REUSE_MS = 5 * 60_000

export type SignInCache = ReturnType<typeof createSignInCache>

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

  const checkNow = () => {
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
    checkNow,
    // For the Member pages: reuses a check from the last `SIGN_IN_REUSE_MS`,
    // including one still in flight.
    checkRecent: () =>
      lastCheck && now() - lastCheck.checkedAt <= SIGN_IN_REUSE_MS
        ? lastCheck.member
        : checkNow(),
    // For a check the server already made while rendering the page, so the
    // first page change after it loads doesn't ask again. Keeps any check
    // already held, which is at least as new.
    remember: (member: SignedInVisitor) => {
      lastCheck ??= { checkedAt: now(), member: Promise.resolve(member) }
    },
    // When the Member opens Edit Profile: the held check stops showing its
    // nav dot at once, even if they leave before the server has saved it.
    sawEditProfile: () => {
      // Changed in place, so `checkNow` can still tell it's the held check.
      if (lastCheck) {
        lastCheck.member = lastCheck.member.then(
          (member) => member && { ...member, editProfileSeen: true },
        )
      }
    },
    // On sign-out, a profile save or an Admin action.
    clear: () => {
      lastCheck = undefined
    },
  }
}
