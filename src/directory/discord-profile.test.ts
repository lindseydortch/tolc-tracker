import { describe, expect, it } from 'vitest'
import { discordAvatarUrl, discordHandle } from './discord-profile'

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

describe('a Discord avatar', () => {
  it("is the Member's custom picture when they set one", () => {
    const avatar = '8342729096ea3675442027381ff50dfe'
    expect(discordAvatarUrl({ userId: '80351110224678912', avatar })).toBe(
      `https://cdn.discordapp.com/avatars/80351110224678912/${avatar}.png?size=128`,
    )
  })

  it("is Discord's default picture, chosen by user ID, when they set none", () => {
    // (80351110224678912 >> 22) % 6 = 5
    expect(
      discordAvatarUrl({ userId: '80351110224678912', avatar: null }),
    ).toBe('https://cdn.discordapp.com/embed/avatars/5.png')
  })
})
