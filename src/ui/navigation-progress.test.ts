// The indicator renders inside a real router, which needs a DOM.
// @vitest-environment happy-dom
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { Fragment, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MIN_SHOWN_MS, NavigationProgress, PENDING_DELAY_MS } from './navigation-progress'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let root: Root | undefined

afterEach(() => {
  root?.unmount()
  document.body.replaceChildren()
})

// A start page plus pages whose loaders beat the pending delay, miss it by a
// little, or miss it by a lot, standing in for the server fetches of the
// real pages.
async function testApp() {
  const rootRoute = createRootRoute({
    component: () => createElement(Fragment, null, createElement(NavigationProgress), createElement(Outlet)),
  })
  const page = (path: string, loadMs: number) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      loader: () => wait(loadMs),
      component: () => createElement('h1', null, path),
    })
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      page('/', 0),
      page('/fast', PENDING_DELAY_MS / 4),
      page('/just-slow', PENDING_DELAY_MS + 20),
      page('/slow', PENDING_DELAY_MS * 3),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  root.render(createElement(RouterProvider, { router }))

  const heading = () => container.querySelector('h1')?.textContent
  const status = () => container.querySelector('[role="status"]')
  const showing = () => status()?.hasAttribute('data-showing') ?? false

  // Records when the indicator showed and hid, however briefly.
  let shownAt: number | undefined
  let hiddenAt: number | undefined
  new MutationObserver(() => {
    if (showing()) shownAt ??= performance.now()
    else if (shownAt !== undefined) hiddenAt ??= performance.now()
  }).observe(container, { subtree: true, childList: true, characterData: true, attributes: true })

  // Pushing to history is what a link click does; unlike `router.navigate`,
  // it isn't typed against the app's own routes.
  const goTo = (path: string) => router.history.push(path)

  await vi.waitFor(() => expect(heading()).toBe('/'))
  return { goTo, heading, status, showing, shownFor: () => (shownAt === undefined ? undefined : (hiddenAt ?? Infinity) - shownAt) }
}

describe('NavigationProgress', () => {
  it('stays quiet while no page is loading', async () => {
    const { status, showing } = await testApp()

    expect(status()).not.toBeNull()
    expect(status()?.textContent).toBe('')
    expect(showing()).toBe(false)
  })

  it('shows and announces a slow navigation until the next page renders', async () => {
    const { goTo, heading, status, showing } = await testApp()

    goTo('/slow')

    await vi.waitFor(() => expect(showing()).toBe(true), { timeout: PENDING_DELAY_MS * 2 })
    expect(status()?.textContent).not.toBe('')
    expect(heading()).toBe('/')

    await vi.waitFor(() => expect(heading()).toBe('/slow'), { timeout: PENDING_DELAY_MS * 4 })
    await vi.waitFor(() => expect(showing()).toBe(false), { timeout: MIN_SHOWN_MS * 2 })
  })

  it("doesn't flash during a navigation faster than the pending delay", async () => {
    const { goTo, heading, shownFor } = await testApp()

    goTo('/fast')
    await vi.waitFor(() => expect(heading()).toBe('/fast'))
    await wait(PENDING_DELAY_MS * 2)

    expect(shownFor()).toBeUndefined()
  })

  it("doesn't flicker when a navigation ends just after the pending delay", async () => {
    const { goTo, heading, shownFor } = await testApp()

    goTo('/just-slow')
    await vi.waitFor(() => expect(heading()).toBe('/just-slow'))
    await vi.waitFor(() => expect(shownFor()).toBeLessThan(Infinity), { timeout: MIN_SHOWN_MS * 2 })

    // Timers can fire a few ms early; anything near the minimum is no flicker.
    expect(shownFor()).toBeGreaterThanOrEqual(MIN_SHOWN_MS - 10)
  })
})
