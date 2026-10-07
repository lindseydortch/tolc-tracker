import { describe, expect, it } from 'vitest'
import { profileCompleteness, type CompletenessProfile } from './profile'
import { emptyLinks } from './profile-links'

// What signup leaves: one Stack Layer filled and no optional Links.
const fromSignup: CompletenessProfile = {
  techStack: [{ name: 'React', stackLayer: 'frontendFramework' }],
  links: emptyLinks(),
}

const complete: CompletenessProfile = {
  techStack: [
    { name: 'React', stackLayer: 'frontendFramework' },
    { name: 'Express', stackLayer: 'backendFramework' },
    { name: 'Node.js', stackLayer: 'backendLanguage' },
    { name: 'PostgreSQL', stackLayer: 'database' },
    { name: 'Docker', stackLayer: null },
  ],
  links: {
    resume: 'https://example.com/resume.pdf',
    portfolio: 'https://example.com',
    x: 'https://x.com/octocat',
    bluesky: 'https://bsky.app/profile/octocat',
    custom: [],
  },
}

describe('profile completeness', () => {
  it('starts a Member fresh from signup at 14%', () => {
    expect(profileCompleteness(fromSignup)).toEqual({
      percent: 14,
      next: 'fill every Stack Layer in your Preferred Stack',
    })
  })

  it('is 100% with nothing next for a complete profile', () => {
    expect(profileCompleteness(complete)).toEqual({ percent: 100, next: null })
  })

  it('gives each part an equal share, rounded to a whole percent', () => {
    const noBluesky = { ...complete, links: { ...complete.links, bluesky: '' } }
    expect(profileCompleteness(noBluesky)).toEqual({
      percent: 86,
      next: 'add your Bluesky profile',
    })

    const withResume = { ...fromSignup, links: { ...fromSignup.links, resume: 'https://example.com/cv' } }
    expect(profileCompleteness(withResume).percent).toBe(29)
  })

  it('names the first missing part, in order', () => {
    const allLayers = { ...complete, techStack: complete.techStack.slice(0, 4) }
    expect(profileCompleteness(allLayers).next).toBe('add a Secondary Skill')

    const noResume = { ...complete, links: { ...complete.links, resume: '' } }
    expect(profileCompleteness(noResume).next).toBe('add your Resume')

    const noPortfolio = { ...complete, links: { ...complete.links, portfolio: ' ' } }
    expect(profileCompleteness(noPortfolio).next).toBe('add your Portfolio')

    const noX = { ...complete, links: { ...complete.links, x: '' } }
    expect(profileCompleteness(noX).next).toBe('add your X profile')
  })

  it("doesn't count Custom Links or the TypeScript Badge", () => {
    const extras: CompletenessProfile = {
      techStack: [...fromSignup.techStack, { name: 'TypeScript', stackLayer: null }],
      links: {
        ...fromSignup.links,
        custom: [{ label: 'My talk', url: 'https://example.com/talk' }],
      },
    }
    expect(profileCompleteness(extras)).toEqual(profileCompleteness(fromSignup))
  })
})
