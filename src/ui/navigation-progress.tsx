import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

// How long a navigation may load before the indicator shows, so fast ones
// don't flash it.
export const PENDING_DELAY_MS = 200
// Once shown, how long the indicator stays, so a load that ends just after
// the delay doesn't flicker it.
export const MIN_SHOWN_MS = 300

// A bar along the top of the window while the next page's loader runs.
// The old page stays on screen until then, so this is the only sign that a
// click was heard. The router's own `pendingComponent` would blank the old
// page instead, which is why this keeps its own delay.
// It follows every router load, so it also shows while a page reloads after
// a profile save or an Admin action (see `reloadAfterChange`), and while the
// Directory reloads for a new search.
// The status region is always in the page, so screen readers announce its
// text when it appears.
export function NavigationProgress() {
  const pending = useRouterState({ select: (state) => state.status === 'pending' })
  const [showing, setShowing] = useState(false)
  const shownAt = useRef(0)

  useEffect(() => {
    if (pending) {
      if (showing) return
      const timer = setTimeout(() => {
        shownAt.current = Date.now()
        setShowing(true)
      }, PENDING_DELAY_MS)
      return () => clearTimeout(timer)
    }
    if (!showing) return
    const shownMs = Date.now() - shownAt.current
    const timer = setTimeout(() => setShowing(false), Math.max(0, MIN_SHOWN_MS - shownMs))
    return () => clearTimeout(timer)
  }, [pending, showing])

  return (
    <div role="status" className="nav-progress" data-showing={showing || undefined}>
      {showing && <span className="visually-hidden">Loading page</span>}
    </div>
  )
}
