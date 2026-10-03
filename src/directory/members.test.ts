import { describe, expect, it } from 'vitest'
import { createTestSetup } from './test-directory'

describe('registering a Member on GitHub sign-in', () => {
  it('creates a Member with their GitHub Link', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const userId = await signUpWithGitHub('octocat')

    await directory.registerMember({ userId, githubUsername: 'octocat' })

    const member = await directory.memberForUser(userId)
    expect(member?.links).toEqual([
      { kind: 'github', url: 'https://github.com/octocat', label: null },
    ])
  })

  it('reuses the same Member when they sign in again', async () => {
    const { directory, signUpWithGitHub } = await createTestSetup()
    const userId = await signUpWithGitHub('octocat')

    await directory.registerMember({ userId, githubUsername: 'octocat' })
    const first = await directory.memberForUser(userId)
    await directory.registerMember({ userId, githubUsername: 'octocat' })
    const second = await directory.memberForUser(userId)

    expect(second?.id).toBe(first?.id)
    expect(second?.links).toHaveLength(1)
  })

  it('has no Member for a user who never signed in', async () => {
    const { directory } = await createTestSetup()

    expect(await directory.memberForUser('nobody')).toBeNull()
  })
})
