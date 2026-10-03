import { describe, expect, it } from 'vitest'
import {
  profileProblems,
  skillsForLayer,
  type ProfileForm,
} from './directory'
import { parseProfileForm } from './profile'
import { starterCatalogs } from './starter-catalogs'
import { createTestSetup } from './test-directory'

const second = 1000
let discordIds = 80351110224678912n

// A Member who is in TOLC and has not filled the signup form yet.
async function memberInTolc(
  setup: Awaited<ReturnType<typeof createTestSetup>>,
  githubUsername: string,
) {
  const { directory, tolc, signUpWithGitHub } = setup
  const authUserId = await signUpWithGitHub(githubUsername)
  await directory.signIn({ authUserId, githubUsername })
  const discord = { userId: String(discordIds++), handle: `${githubUsername}_dc` }
  await directory.connectDiscord({ authUserId, discord })
  tolc.join(discord.userId)
  const now = new Date()
  await directory.refreshMembership({ authUserId, sessionStartedAt: now, now })
  return { authUserId, discord, now }
}

async function seededSetup() {
  const setup = await createTestSetup()
  await setup.directory.seedCatalogs(starterCatalogs)
  return setup
}

async function seededCatalogs() {
  return (await seededSetup()).directory.catalogs()
}

const octoForm: ProfileForm = {
  firstName: 'Octo',
  lastName: 'Cat',
  linkedinUrl: 'https://www.linkedin.com/in/octocat',
  jobSearchStatus: 'activelyLooking',
  targetRoles: ['Software Engineer'],
  preferredSeniority: 'senior',
  otherSeniorities: ['mid'],
  preferredStack: { frontendFramework: 'React', database: 'PostgreSQL' },
}

const emptyForm: ProfileForm = {
  firstName: '',
  lastName: '',
  linkedinUrl: '',
  jobSearchStatus: null,
  targetRoles: [],
  preferredSeniority: null,
  otherSeniorities: [],
  preferredStack: {},
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
    expect(await setup.directory.listDirectory()).toEqual([])
  })

  it('lists a completed profile in the Directory', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')

    expect(
      await setup.directory.completeProfile({ authUserId, form: octoForm }),
    ).toEqual({ ok: true })

    expect(await setup.directory.isProfileComplete(authUserId)).toBe(true)
    expect(await setup.directory.listDirectory()).toEqual([
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

    const [entry] = await setup.directory.listDirectory()
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

    const [entry] = await setup.directory.listDirectory()
    expect(entry.targetRoles).toEqual(['Software Engineer'])
  })

  it('rejects names that are not in the Catalogs', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')

    const result = await setup.directory.completeProfile({
      authUserId,
      form: {
        ...octoForm,
        targetRoles: ['Wizard'],
        preferredStack: { database: 'Clay Tablets' },
      },
    })

    expect(result).toEqual({
      ok: false,
      problems: {
        targetRoles: 'Pick "Wizard" from the Role Catalog',
        preferredStack: 'Pick "Clay Tablets" from the Skill Catalog',
      },
    })
    expect(await setup.directory.listDirectory()).toEqual([])
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

    const [entry] = await setup.directory.listDirectory()
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

    expect(await setup.directory.listDirectory()).toEqual([
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

    const entries = await setup.directory.listDirectory()
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

    const entries = await setup.directory.listDirectory()
    expect(entries.map((entry) => entry.firstName)).toEqual(['Octo'])
  })

  it('leaves out Hidden Members until they rejoin TOLC', async () => {
    const setup = await seededSetup()
    const { authUserId, discord, now } = await memberInTolc(setup, 'octocat')
    await setup.directory.completeProfile({ authUserId, form: octoForm })
    const signInAgain = (at: Date) =>
      setup.directory.refreshMembership({ authUserId, sessionStartedAt: at, now: at })

    setup.tolc.leave(discord.userId)
    await signInAgain(new Date(now.getTime() + 60 * second))
    expect(await setup.directory.listDirectory()).toEqual([])

    setup.tolc.join(discord.userId)
    await signInAgain(new Date(now.getTime() + 120 * second))
    expect(await setup.directory.listDirectory()).toHaveLength(1)
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
