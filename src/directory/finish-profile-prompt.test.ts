import { describe, expect, it } from 'vitest'
import { createFinishProfilePrompt } from './finish-profile-prompt'

describe('createFinishProfilePrompt', () => {
  it('is down until signup raises it', () => {
    const prompt = createFinishProfilePrompt()
    expect(prompt.isRaised()).toBe(false)

    prompt.raise()
    expect(prompt.isRaised()).toBe(true)
  })

  it('stays down once the Directory has shown it', () => {
    const prompt = createFinishProfilePrompt()
    prompt.raise()

    prompt.lower()

    expect(prompt.isRaised()).toBe(false)
  })
})
