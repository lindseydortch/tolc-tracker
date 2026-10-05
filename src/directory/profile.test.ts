import { describe, expect, it } from 'vitest'
import { emptySearch } from './search'
import { emptyForm, profileProblems, skillsForLayer } from './profile'
import { emptyLinks } from './profile-links'
import { parseAddSkillForm, parseLinksForm, parseProfileForm } from './profile-parsing'
import { hideAsAdmin, memberInTolc, octoForm, seededSetup } from './test-profiles'

async function seededCatalogs() {
  return (await seededSetup()).directory.catalogs()
}

describe('the signup form', () => {
  it('reports every missing required field', async () => {
    const catalogs = await seededCatalogs()
    expect(Object.keys(profileProblems(emptyForm, catalogs)).sort()).toEqual([
      'firstName',
      'jobSearchStatus',
      'lastName',
      'linkedinUrl',
      'preferredSeniority',
      'preferredStack',
      'targetRoles',
    ])
    expect(profileProblems(octoForm, catalogs)).toEqual({})
  })

  it('treats blank names and blank picks as missing', async () => {
    const problems = profileProblems(
      {
        ...octoForm,
        firstName: '  ',
        targetRoles: [' '],
        preferredStack: { frontendFramework: '  ' },
      },
      await seededCatalogs(),
    )
    expect(Object.keys(problems).sort()).toEqual([
      'firstName',
      'preferredStack',
      'targetRoles',
    ])
  })

  it('requires a LinkedIn URL', async () => {
    const catalogs = await seededCatalogs()
    const problemFor = (linkedinUrl: string) =>
      profileProblems({ ...octoForm, linkedinUrl }, catalogs).linkedinUrl
    expect(problemFor('https://github.com/octocat')).toBeDefined()
    expect(problemFor('not a url')).toBeDefined()
    expect(problemFor('https://evil-linkedin.com/in/octo')).toBeDefined()
    expect(problemFor('linkedin.com/in/octocat')).toBeUndefined()
    expect(problemFor('https://linkedin.com/in/octocat')).toBeUndefined()
  })

  it('never lets TypeScript fill a Stack Layer', async () => {
    const problems = profileProblems(
      { ...octoForm, preferredStack: { backendLanguage: 'ts' } },
      await seededCatalogs(),
    )
    expect(problems.preferredStack).toBe('TypeScript can never fill a Stack Layer')
  })
})

describe('a signup form sent to the server', () => {
  it('passes a well-formed form through', () => {
    expect(parseProfileForm(octoForm)).toEqual(octoForm)
    expect(parseProfileForm(emptyForm)).toEqual(emptyForm)
  })

  it('rejects a malformed form', () => {
    expect(() => parseProfileForm(null)).toThrow('Malformed signup form')
    expect(() => parseProfileForm({ ...octoForm, firstName: 1 })).toThrow('firstName')
    expect(() =>
      parseProfileForm({ ...octoForm, jobSearchStatus: 'retired' }),
    ).toThrow('jobSearchStatus')
    expect(() =>
      parseProfileForm({ ...octoForm, otherSeniorities: ['intern'] }),
    ).toThrow('otherSeniorities')
    expect(() =>
      parseProfileForm({ ...octoForm, preferredStack: { cloud: 'AWS' } }),
    ).toThrow('preferredStack')
    expect(() =>
      parseProfileForm({ ...octoForm, preferredStack: { database: 3 } }),
    ).toThrow('preferredStack')
    // Names every object inherits are not Job Search Statuses or Seniorities.
    expect(() =>
      parseProfileForm({ ...octoForm, jobSearchStatus: 'toString' }),
    ).toThrow('jobSearchStatus')
    expect(() =>
      parseProfileForm({ ...octoForm, preferredSeniority: 'constructor' }),
    ).toThrow('preferredSeniority')
    expect(() =>
      parseProfileForm({ ...octoForm, preferredStack: { hasOwnProperty: 'React' } }),
    ).toThrow('preferredStack')
  })
})

describe('profile edits sent to the server', () => {
  it('passes well-formed Links and Skills through', () => {
    const links = {
      resume: 'https://octo.dev/cv',
      portfolio: '',
      x: 'https://x.com/octocat',
      bluesky: '',
      custom: [{ label: 'Talk', url: 'https://youtu.be/talk' }],
    }
    expect(parseLinksForm(links)).toEqual(links)
    const skill = { skill: 'Vue', stackLayer: 'frontendFramework', replace: true }
    expect(parseAddSkillForm(skill)).toEqual(skill)
  })

  it('rejects malformed Links and Skills', () => {
    const links = emptyLinks()
    expect(() => parseLinksForm({ ...links, resume: null })).toThrow('Malformed Links: resume')
    expect(() => parseLinksForm({ ...links, custom: [{ label: 'x' }] })).toThrow(
      'Malformed Custom Link: url',
    )
    expect(() =>
      parseAddSkillForm({ skill: 'Vue', stackLayer: 'cloud', replace: false }),
    ).toThrow('stackLayer')
    expect(() =>
      parseAddSkillForm({ skill: 'Vue', stackLayer: null, replace: 'yes' }),
    ).toThrow('replace')
  })
})

describe('completing a profile', () => {
  it('blocks an incomplete profile and keeps it out of the Directory', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')

    const result = await setup.directory.completeProfile({
      authUserId,
      form: { ...octoForm, targetRoles: [] },
    })

    expect(result).toEqual({
      ok: false,
      problems: { targetRoles: expect.any(String) },
    })
    expect(await setup.directory.isProfileComplete(authUserId)).toBe(false)
    expect(await setup.directory.searchDirectory(emptySearch)).toEqual([])
  })

  it('lists a completed profile in the Directory', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')

    expect(
      await setup.directory.completeProfile({ authUserId, form: octoForm }),
    ).toEqual({ ok: true })

    expect(await setup.directory.isProfileComplete(authUserId)).toBe(true)
    expect(await setup.directory.searchDirectory(emptySearch)).toEqual([
      {
        id: expect.any(Number),
        firstName: 'Octo',
        lastName: 'Cat',
        discordHandle: 'octocat_dc',
        jobSearchStatus: 'activelyLooking',
        targetRoles: ['Software Engineer'],
        preferredSeniority: 'senior',
        otherSeniorities: ['mid'],
        preferredStack: { frontendFramework: 'React', database: 'PostgreSQL' },
        typeScriptBadge: false,
      },
    ])
    const member = await setup.directory.memberForAuthUser(authUserId)
    expect(member?.links).toContainEqual({
      kind: 'linkedin',
      url: 'https://www.linkedin.com/in/octocat',
      label: null,
    })
  })

  it('resolves Aliases and differently cased or punctuated names', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')

    await setup.directory.completeProfile({
      authUserId,
      form: {
        ...octoForm,
        targetRoles: ['swe', 'FRONT END developer'],
        preferredStack: {
          frontendFramework: 'react.js',
          backendLanguage: 'node',
          database: 'Postgres',
        },
      },
    })

    const [entry] = await setup.directory.searchDirectory(emptySearch)
    expect(entry.targetRoles).toEqual(['Frontend Engineer', 'Software Engineer'])
    expect(entry.preferredStack).toEqual({
      frontendFramework: 'React',
      backendLanguage: 'Node.js',
      database: 'PostgreSQL',
    })
  })

  it('keeps one Target Role when two names resolve to it', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')

    await setup.directory.completeProfile({
      authUserId,
      form: { ...octoForm, targetRoles: ['SWE', 'Software Engineer'] },
    })

    const [entry] = await setup.directory.searchDirectory(emptySearch)
    expect(entry.targetRoles).toEqual(['Software Engineer'])
  })

  it('creates Target Roles and Skills that are not in the Catalogs', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')

    const result = await setup.directory.completeProfile({
      authUserId,
      form: {
        ...octoForm,
        targetRoles: ['Wizard', 'Software Engineer'],
        preferredStack: { database: 'Clay Tablets' },
      },
    })

    expect(result).toEqual({ ok: true })
    const [entry] = await setup.directory.searchDirectory(emptySearch)
    expect(entry.targetRoles).toEqual(['Software Engineer', 'Wizard'])
    expect(entry.preferredStack).toEqual({ database: 'Clay Tablets' })
    expect(await setup.directory.roleCatalog()).toContainEqual({
      name: 'Wizard',
      aliases: [],
    })
    expect(await setup.directory.skillCatalog()).toContainEqual({
      name: 'Clay Tablets',
      suggestedLayer: 'database',
      aliases: [],
    })
  })

  it('rejects one Skill in two Stack Layers', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')

    const result = await setup.directory.completeProfile({
      authUserId,
      form: {
        ...octoForm,
        preferredStack: { backendFramework: 'Node.js', backendLanguage: 'node' },
      },
    })

    expect(result).toEqual({
      ok: false,
      problems: { preferredStack: 'Node.js can only fill one Stack Layer' },
    })
  })

  it('marks exactly one Seniority as Preferred', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')

    await setup.directory.completeProfile({
      authUserId,
      form: {
        ...octoForm,
        preferredSeniority: 'senior',
        otherSeniorities: ['senior', 'staffPlus', 'mid', 'mid'],
      },
    })

    const [entry] = await setup.directory.searchDirectory(emptySearch)
    expect(entry.preferredSeniority).toBe('senior')
    expect(entry.otherSeniorities).toEqual(['mid', 'staffPlus'])
  })

  it('replaces the profile when the form is sent again', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')
    await setup.directory.completeProfile({ authUserId, form: octoForm })

    await setup.directory.completeProfile({
      authUserId,
      form: {
        ...octoForm,
        firstName: 'Mona',
        linkedinUrl: 'https://linkedin.com/in/mona',
        targetRoles: ['Backend Engineer'],
        preferredSeniority: 'staffPlus',
        otherSeniorities: [],
        preferredStack: { backendLanguage: 'Go' },
      },
    })

    expect(await setup.directory.searchDirectory(emptySearch)).toEqual([
      expect.objectContaining({
        firstName: 'Mona',
        targetRoles: ['Backend Engineer'],
        preferredSeniority: 'staffPlus',
        otherSeniorities: [],
        preferredStack: { backendLanguage: 'Go' },
      }),
    ])
    const member = await setup.directory.memberForAuthUser(authUserId)
    expect(member?.links.filter((link) => link.kind === 'linkedin')).toEqual([
      { kind: 'linkedin', url: 'https://linkedin.com/in/mona', label: null },
    ])
  })

  it('refuses to complete a profile for someone who never signed in', async () => {
    const setup = await seededSetup()

    await expect(
      setup.directory.completeProfile({ authUserId: 'nobody', form: octoForm }),
    ).rejects.toThrow('No Member for auth user "nobody"')
  })
})

describe('the Directory', () => {
  it('lists every complete Member regardless of Job Search Status', async () => {
    const setup = await seededSetup()
    const octo = await memberInTolc(setup, 'octocat')
    const mona = await memberInTolc(setup, 'mona')
    await setup.directory.completeProfile({
      authUserId: octo.authUserId,
      form: { ...octoForm, jobSearchStatus: 'notLooking' },
    })
    await setup.directory.completeProfile({
      authUserId: mona.authUserId,
      form: {
        ...octoForm,
        firstName: 'Mona',
        lastName: 'Lisa',
        jobSearchStatus: 'employedOpenToOffers',
      },
    })

    const entries = await setup.directory.searchDirectory(emptySearch)
    expect(entries.map((entry) => [entry.firstName, entry.jobSearchStatus])).toEqual([
      ['Mona', 'employedOpenToOffers'],
      ['Octo', 'notLooking'],
    ])
  })

  it('leaves out Members who have not completed their profile', async () => {
    const setup = await seededSetup()
    const octo = await memberInTolc(setup, 'octocat')
    await memberInTolc(setup, 'mona')
    await setup.directory.completeProfile({
      authUserId: octo.authUserId,
      form: octoForm,
    })

    const entries = await setup.directory.searchDirectory(emptySearch)
    expect(entries.map((entry) => entry.firstName)).toEqual(['Octo'])
  })

  it('leaves out Hidden Members until the Admin reactivates them', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')
    await setup.directory.completeProfile({ authUserId, form: octoForm })

    const { admin, memberId } = await hideAsAdmin(setup, authUserId)
    expect(await setup.directory.searchDirectory(emptySearch)).toEqual([])

    await setup.directory.reactivateMember({ authUserId: admin, memberId })
    expect(await setup.directory.searchDirectory(emptySearch)).toHaveLength(1)
  })
})

describe('Stack Layer suggestions', () => {
  it('suggests Skills with that suggested Layer first', async () => {
    const setup = await seededSetup()
    const catalog = await setup.directory.skillCatalog()

    const choices = skillsForLayer(catalog, 'database')

    const firstOther = choices.findIndex(
      (skill) => skill.suggestedLayer !== 'database',
    )
    expect(firstOther).toBeGreaterThan(0)
    expect(
      choices.slice(0, firstOther).every((skill) => skill.suggestedLayer === 'database'),
    ).toBe(true)
    expect(
      choices.slice(firstOther).some((skill) => skill.suggestedLayer === 'database'),
    ).toBe(false)
    expect(choices.map((skill) => skill.name)).toContain('PostgreSQL')
    // Other Skills can still fill the Layer, they're just listed later.
    expect(choices.map((skill) => skill.name)).toContain('React')
    expect(choices).toHaveLength(catalog.length - 1)
  })

  it('never suggests TypeScript', async () => {
    const setup = await seededSetup()
    const catalog = await setup.directory.skillCatalog()

    for (const layer of ['frontendFramework', 'backendLanguage'] as const) {
      expect(skillsForLayer(catalog, layer).map((skill) => skill.name)).not.toContain(
        'TypeScript',
      )
    }
  })
})

describe('the Quick View', () => {
  it('shows the TypeScript Badge for Members who know TypeScript', async () => {
    const setup = await seededSetup()
    const octo = await memberInTolc(setup, 'octocat')
    const mona = await memberInTolc(setup, 'mona')
    await setup.directory.completeProfile({ authUserId: octo.authUserId, form: octoForm })
    await setup.directory.completeProfile({
      authUserId: mona.authUserId,
      form: { ...octoForm, firstName: 'Mona' },
    })
    await setup.directory.setTypeScriptBadge({ authUserId: octo.authUserId, on: true })

    const entries = await setup.directory.searchDirectory(emptySearch)

    expect(entries.map((entry) => [entry.firstName, entry.typeScriptBadge])).toEqual([
      ['Mona', false],
      ['Octo', true],
    ])
  })

  it('leaves Secondary Skills off the cards', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')
    await setup.directory.completeProfile({ authUserId, form: octoForm })
    await setup.directory.addSkill({ authUserId, skill: 'Docker' })

    const [entry] = await setup.directory.searchDirectory(emptySearch)

    expect(JSON.stringify(entry)).not.toContain('Docker')
  })
})

describe('a Member profile page', () => {
  async function octoWithFullProfile() {
    const setup = await seededSetup()
    const octo = await memberInTolc(setup, 'octocat')
    await setup.directory.completeProfile({ authUserId: octo.authUserId, form: octoForm })
    const [{ id }] = await setup.directory.searchDirectory(emptySearch)
    return { setup, octo, id }
  }

  it('shows the Preferred Stack by Stack Layer, Secondary Skills, and all Links', async () => {
    const { setup, octo, id } = await octoWithFullProfile()
    await setup.directory.setTypeScriptBadge({ authUserId: octo.authUserId, on: true })
    await setup.directory.addSkill({ authUserId: octo.authUserId, skill: 'Docker' })
    await setup.directory.saveLinks({
      authUserId: octo.authUserId,
      links: {
        resume: 'https://example.com/cv.pdf',
        portfolio: '',
        x: 'https://x.com/octocat',
        bluesky: 'https://bsky.app/profile/octocat',
        custom: [{ label: 'My talk', url: 'https://example.com/talk' }],
      },
    })

    expect(await setup.directory.memberProfile(id)).toEqual({
      id,
      firstName: 'Octo',
      lastName: 'Cat',
      discordHandle: 'octocat_dc',
      jobSearchStatus: 'activelyLooking',
      targetRoles: ['Software Engineer'],
      preferredSeniority: 'senior',
      otherSeniorities: ['mid'],
      preferredStack: { frontendFramework: 'React', database: 'PostgreSQL' },
      typeScriptBadge: true,
      secondarySkills: ['Docker', 'TypeScript'],
      links: [
        { kind: 'linkedin', url: 'https://www.linkedin.com/in/octocat', label: null },
        { kind: 'github', url: 'https://github.com/octocat', label: null },
        { kind: 'resume', url: 'https://example.com/cv.pdf', label: null },
        { kind: 'x', url: 'https://x.com/octocat', label: null },
        { kind: 'bluesky', url: 'https://bsky.app/profile/octocat', label: null },
        { kind: 'custom', url: 'https://example.com/talk', label: 'My talk' },
      ],
    })
  })

  it('is not reachable for a Hidden Member', async () => {
    const { setup, octo, id } = await octoWithFullProfile()

    await hideAsAdmin(setup, octo.authUserId)

    expect(await setup.directory.memberProfile(id)).toBeNull()
  })

  it('is not reachable for an incomplete profile', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')

    const member = await setup.directory.memberForAuthUser(authUserId)

    expect(await setup.directory.memberProfile(member!.id)).toBeNull()
  })

  it('is not reachable for an unknown Member', async () => {
    const { setup, id } = await octoWithFullProfile()

    expect(await setup.directory.memberProfile(id + 1)).toBeNull()
  })
})
