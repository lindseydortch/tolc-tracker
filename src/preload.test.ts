// The router only navigates with a DOM.
// @vitest-environment happy-dom
import { RouterProvider } from '@tanstack/react-router'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { testRouter } from './directory/test-router'
import { PRELOAD_DELAY_MS, PRELOAD_STALE_TIME_MS } from './preload'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let root: Root | undefined

afterEach(() => {
  root?.unmount()
  root = undefined
  document.body.replaceChildren()
  vi.useRealTimers()
})

// Renders the editor page, whose link to the Directory can be hovered.
async function renderEditor() {
  const app = testRouter('/edit-profile')
  const container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  root.render(createElement(RouterProvider, { router: app.router }))
  const link = await vi.waitFor(() => {
    const found = container.querySelector('a')
    if (!found) throw new Error('link not rendered yet')
    return found
  })
  // React listens for mouseover/mouseout to fire onMouseEnter/onMouseLeave.
  const hover = () => link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  const unhover = () => link.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  return { ...app, hover, unhover }
}

describe('preloadOptions', () => {
  it('shows the hover preload when the click comes right after the hover', async () => {
    const { db, router, shownOnDirectory } = testRouter('/edit-profile')
    await router.load()

    await router.preloadRoute({ to: '/' })
    await router.navigate({ to: '/' })

    expect(db.fetches).toBe(1)
    expect(shownOnDirectory()).toBe('old')
  })

  it('refetches when the click comes after the preload went stale', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { db, router, shownOnDirectory } = testRouter('/edit-profile')
    await router.load()

    await router.preloadRoute({ to: '/' })
    db.saved = 'new'
    vi.setSystemTime(Date.now() + PRELOAD_STALE_TIME_MS + 1)
    await router.navigate({ to: '/' })

    expect(db.fetches).toBe(2)
    await vi.waitFor(() => expect(shownOnDirectory()).toBe('new'))
  })

  it("doesn't preload a link the pointer passes over faster than the delay", async () => {
    const { db, hover, unhover } = await renderEditor()

    hover()
    await wait(PRELOAD_DELAY_MS / 5)
    unhover()
    await wait(PRELOAD_DELAY_MS * 2)

    expect(db.fetches).toBe(0)
  })

  it('preloads a link the pointer rests on past the delay', async () => {
    const { db, hover } = await renderEditor()

    hover()

    await vi.waitFor(() => expect(db.fetches).toBe(1), { timeout: PRELOAD_DELAY_MS * 4 })
  })
})
