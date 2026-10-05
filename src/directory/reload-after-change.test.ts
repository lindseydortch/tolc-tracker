// The router only navigates with a DOM.
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { reloadAfterChange } from './reload-after-change'
import { testRouter } from './test-router'

describe('reloadAfterChange', () => {
  it('makes the Directory show the saved data on first render after an edit', async () => {
    const { db, router, shownOnDirectory } = testRouter()
    await router.load()
    await router.navigate({ to: '/edit-profile' })

    db.saved = 'new'
    await reloadAfterChange(router)
    await router.navigate({ to: '/' })

    expect(shownOnDirectory()).toBe('new')
  })

  it('makes the Member profile page show the saved data on first render after an edit', async () => {
    const { db, router, shownOnProfile } = testRouter()
    await router.load()
    await router.navigate({ to: '/members/$memberId', params: { memberId: '1' } })
    await router.navigate({ to: '/edit-profile' })

    db.saved = 'new'
    await reloadAfterChange(router)
    await router.navigate({ to: '/members/$memberId', params: { memberId: '1' } })

    expect(shownOnProfile()).toBe('new')
  })

  it('drops a Directory hover-preloaded just before the edit, while still fresh', async () => {
    const { db, router, shownOnDirectory } = testRouter()
    await router.load()
    await router.navigate({ to: '/edit-profile' })
    await router.preloadRoute({ to: '/' })

    db.saved = 'new'
    await reloadAfterChange(router)
    await router.navigate({ to: '/' })

    expect(shownOnDirectory()).toBe('new')
  })

  it('leaves a return to the Directory without an edit showing cached data at once', async () => {
    const { db, router, shownOnDirectory } = testRouter()
    await router.load()
    await router.navigate({ to: '/edit-profile' })

    db.saved = 'new'
    await router.navigate({ to: '/' })

    expect(shownOnDirectory()).toBe('old')
  })
})
