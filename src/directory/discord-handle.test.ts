import { describe, expect, it } from 'vitest'
import { discordHandle } from './discord-handle'

describe('a Discord handle', () => {
  it('is the username for accounts on the new username system', () => {
    expect(discordHandle({ username: 'octocat', discriminator: '0' })).toBe(
      'octocat',
    )
  })

  it('keeps the discriminator for legacy accounts', () => {
    expect(discordHandle({ username: 'Octocat', discriminator: '1234' })).toBe(
      'Octocat#1234',
    )
  })
})
