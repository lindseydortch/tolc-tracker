import { describe, expect, it } from 'vitest'
import { createTestSetup } from './test-directory'

describe('signing in a Member with GitHub', () => {
  it('creates a Member with their GitHub Link on first sign-in', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')

    const signedIn = await directory.signIn({
      authUserId,
      githubUsername: 'octocat',
    })

    expect(signedIn?.githubUrl).toBe('https://github.com/octocat')
    const member = await directory.memberForAuthUser(authUserId)
    expect(member?.links).toEqual([
      { kind: 'github', url: 'https://github.com/octocat', label: null },
    ])
  })

  it('reuses the same Member when they sign in again', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')

    const first = await directory.signIn({ authUserId, githubUsername: 'octocat' })
    const second = await directory.signIn({ authUserId, githubUsername: 'octocat' })

    expect(second?.id).toBe(first?.id)
    expect((await directory.memberForAuthUser(authUserId))?.links).toHaveLength(1)
  })

  it('updates the GitHub Link after a GitHub rename', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')
    await directory.signIn({ authUserId, githubUsername: 'octocat' })

    const signedIn = await directory.signIn({
      authUserId,
      githubUsername: 'octo-renamed',
    })

    expect(signedIn?.githubUrl).toBe('https://github.com/octo-renamed')
    expect((await directory.memberForAuthUser(authUserId))?.links).toEqual([
      { kind: 'github', url: 'https://github.com/octo-renamed', label: null },
    ])
  })

  it('treats a sign-in without a GitHub username as signed out', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const authUserId = await signUpWithGitHub('octocat')

    expect(await directory.signIn({ authUserId, githubUsername: null })).toBeNull()
    expect(await directory.memberForAuthUser(authUserId)).toBeNull()
  })

  it('has no Member for someone who never signed in', async () => {
    const { directory } = await createTestSetup()

    expect(await directory.memberForAuthUser('nobody')).toBeNull()
  })
})
