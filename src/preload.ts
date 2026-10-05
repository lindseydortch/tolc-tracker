// Hovering or focusing a link preloads its page after this delay, so passing
// over many links doesn't fetch them all.
export const PRELOAD_DELAY_MS = 50

// A click within this window renders from that preload instead of fetching
// again. Past it, the page shows the preload and refetches in the background.
// A profile edit or an Admin action drops preloads (`reloadAfterChange`).
export const PRELOAD_STALE_TIME_MS = 10_000

export const preloadOptions = {
  defaultPreload: 'intent',
  defaultPreloadDelay: PRELOAD_DELAY_MS,
  defaultPreloadStaleTime: PRELOAD_STALE_TIME_MS,
} as const
