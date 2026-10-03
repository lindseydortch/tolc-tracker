import { describe, expect, it } from 'vitest'
import type { ProfileForm } from './profile'
import {
  emptySearch,
  parseDirectorySearch,
  searchFromUrl,
  searchToUrl,
  type DirectorySearch,
} from './search'
import { memberInTolc, octoForm, seededSetup, type TestSetup } from './test-profiles'

// A complete Member named `firstName`, with `changes` made to `octoForm`.
async function member(
  setup: TestSetup,
  firstName: string,
  changes: Partial<ProfileForm> = {},
) {
  const { authUserId } = await memberInTolc(setup, firstName.toLowerCase())
  const result = await setup.directory.completeProfile({
    authUserId,
    form: { ...octoForm, firstName, ...changes },
  })
  if (!result.ok) throw new Error(`${firstName} should have a complete profile`)
  return authUserId
}

async function search(setup: TestSetup, changes: Partial<DirectorySearch>) {
  const entries = await setup.directory.searchDirectory({ ...emptySearch, ...changes })
  return entries.map((entry) => entry.firstName)
}

describe('searching the Directory by Skill', () => {
  it('returns only Members who have every chosen Skill', async () => {
    const setup = await seededSetup()
    await member(setup, 'Ada', {
      preferredStack: { frontendFramework: 'React', database: 'PostgreSQL' },
    })
    await member(setup, 'Bea', {
      preferredStack: { frontendFramework: 'React', database: 'MongoDB' },
    })
    const cy = await member(setup, 'Cy', {
      preferredStack: { frontendFramework: 'Vue' },
    })
    await setup.directory.addSkill({ authUserId: cy, skill: 'React' })
    await setup.directory.addSkill({ authUserId: cy, skill: 'PostgreSQL' })

    expect(await search(setup, { skills: ['React', 'PostgreSQL'] })).toEqual([
      'Ada',
      'Cy',
    ])
    expect(await search(setup, { skills: ['React'] })).toEqual(['Ada', 'Bea', 'Cy'])
  })

  it('resolves Skills through Aliases', async () => {
    const setup = await seededSetup()
    const ada = await member(setup, 'Ada')
    await member(setup, 'Bea')
    await setup.directory.addSkill({ authUserId: ada, skill: 'Kubernetes' })

    expect(await search(setup, { skills: ['K8s'] })).toEqual(['Ada'])
    expect(await search(setup, { skills: ['postgres', 'react.js'] })).toEqual([
      'Ada',
      'Bea',
    ])
  })

  it('finds TypeScript Badge holders when searching TypeScript', async () => {
    const setup = await seededSetup()
    const ada = await member(setup, 'Ada')
    await member(setup, 'Bea')
    await setup.directory.setTypeScriptBadge({ authUserId: ada, on: true })

    expect(await search(setup, { skills: ['TypeScript'] })).toEqual(['Ada'])
    expect(await search(setup, { skills: ['TS'] })).toEqual(['Ada'])
  })

  it('returns nobody for a Skill not in the Skill Catalog', async () => {
    const setup = await seededSetup()
    await member(setup, 'Ada')

    expect(await search(setup, { skills: ['React', 'Nonexistent Lang'] })).toEqual([])
  })

  it('ignores blank Skills', async () => {
    const setup = await seededSetup()
    await member(setup, 'Ada')

    expect(await search(setup, { skills: ['React', ' '] })).toEqual(['Ada'])
  })
})

describe('filtering the Directory', () => {
  it('by Target Role, through Aliases, keeping Members with any chosen one', async () => {
    const setup = await seededSetup()
    await member(setup, 'Ada', { targetRoles: ['Site Reliability Engineer'] })
    await member(setup, 'Bea', { targetRoles: ['Software Engineer'] })
    await member(setup, 'Cy', { targetRoles: ['Product Engineer'] })

    expect(await search(setup, { targetRoles: ['SRE'] })).toEqual(['Ada'])
    expect(
      await search(setup, { targetRoles: ['SRE', 'Software Engineer'] }),
    ).toEqual(['Ada', 'Bea'])
    expect(await search(setup, { targetRoles: ['Astronaut'] })).toEqual([])
  })

  it('by Job Search Status, keeping Members with any chosen one', async () => {
    const setup = await seededSetup()
    await member(setup, 'Ada', { jobSearchStatus: 'activelyLooking' })
    await member(setup, 'Bea', { jobSearchStatus: 'notLooking' })
    await member(setup, 'Cy', { jobSearchStatus: 'employedOpenToOffers' })

    expect(await search(setup, { jobSearchStatuses: ['notLooking'] })).toEqual(['Bea'])
    expect(
      await search(setup, {
        jobSearchStatuses: ['activelyLooking', 'employedOpenToOffers'],
      }),
    ).toEqual(['Ada', 'Cy'])
  })

  it('by Seniority, keeping Members who prefer or accept a chosen one', async () => {
    const setup = await seededSetup()
    await member(setup, 'Ada', { preferredSeniority: 'senior', otherSeniorities: [] })
    await member(setup, 'Bea', { preferredSeniority: 'mid', otherSeniorities: ['senior'] })
    await member(setup, 'Cy', { preferredSeniority: 'junior', otherSeniorities: ['mid'] })

    expect(await search(setup, { seniorities: ['senior'] })).toEqual(['Ada', 'Bea'])
  })

  it('combines every filter', async () => {
    const setup = await seededSetup()
    await member(setup, 'Ada', { jobSearchStatus: 'activelyLooking' })
    await member(setup, 'Bea', { jobSearchStatus: 'notLooking' })
    await member(setup, 'Cy', {
      jobSearchStatus: 'activelyLooking',
      targetRoles: ['Product Engineer'],
    })

    expect(
      await search(setup, {
        skills: ['React'],
        targetRoles: ['Software Engineer'],
        seniorities: ['senior'],
        jobSearchStatuses: ['activelyLooking'],
      }),
    ).toEqual(['Ada'])
  })

  it('returns the whole Directory with nothing chosen', async () => {
    const setup = await seededSetup()
    await member(setup, 'Bea')
    await member(setup, 'Ada')

    expect(await search(setup, {})).toEqual(['Ada', 'Bea'])
  })

  it('leaves out Hidden Members', async () => {
    const setup = await seededSetup()
    const { authUserId, discord, now } = await memberInTolc(setup, 'ada')
    await setup.directory.completeProfile({ authUserId, form: octoForm })
    const later = new Date(now.getTime() + 60_000)

    setup.tolc.leave(discord.userId)
    await setup.directory.refreshMembership({
      authUserId,
      sessionStartedAt: later,
      now: later,
    })

    expect(await search(setup, { skills: ['React'] })).toEqual([])
  })
})

describe('ranking search results', () => {
  it('puts Members with every chosen Skill as Primary above those with any as Secondary', async () => {
    const setup = await seededSetup()
    const ada = await member(setup, 'Ada', {
      preferredStack: { frontendFramework: 'React' },
    })
    await member(setup, 'Bea', {
      preferredStack: { frontendFramework: 'React', database: 'PostgreSQL' },
    })
    await setup.directory.addSkill({ authUserId: ada, skill: 'PostgreSQL' })

    expect(await search(setup, { skills: ['React', 'PostgreSQL'] })).toEqual([
      'Bea',
      'Ada',
    ])
  })

  it('then puts a Preferred Seniority match above an accepted one', async () => {
    const setup = await seededSetup()
    const primary = { frontendFramework: 'React' } as const
    const ada = await member(setup, 'Ada', {
      preferredStack: { frontendFramework: 'Vue' },
      preferredSeniority: 'senior',
      otherSeniorities: [],
    })
    await setup.directory.addSkill({ authUserId: ada, skill: 'React' })
    await member(setup, 'Bea', {
      preferredStack: primary,
      preferredSeniority: 'mid',
      otherSeniorities: ['senior'],
    })
    await member(setup, 'Cy', {
      preferredStack: primary,
      preferredSeniority: 'senior',
      otherSeniorities: [],
    })
    const dee = await member(setup, 'Dee', {
      preferredStack: { frontendFramework: 'Vue' },
      preferredSeniority: 'mid',
      otherSeniorities: ['senior'],
    })
    await setup.directory.addSkill({ authUserId: dee, skill: 'React' })

    // Primary before Secondary; within each, Preferred before accepted.
    expect(
      await search(setup, { skills: ['React'], seniorities: ['senior'] }),
    ).toEqual(['Cy', 'Bea', 'Ada', 'Dee'])
  })

  it('ranks by Seniority alone when no Skill is chosen, then by name', async () => {
    const setup = await seededSetup()
    await member(setup, 'Ada', { preferredSeniority: 'mid', otherSeniorities: ['senior'] })
    await member(setup, 'Bea', { preferredSeniority: 'senior', otherSeniorities: [] })
    await member(setup, 'Cy', { preferredSeniority: 'mid', otherSeniorities: ['senior'] })

    expect(await search(setup, { seniorities: ['senior'] })).toEqual([
      'Bea',
      'Ada',
      'Cy',
    ])
  })
})

describe('a search sent to the server', () => {
  it('accepts a well-formed search', () => {
    const sent = {
      skills: ['React'],
      targetRoles: ['SRE'],
      seniorities: ['senior'],
      jobSearchStatuses: ['activelyLooking'],
    }

    expect(parseDirectorySearch(sent)).toEqual(sent)
  })

  it('rejects anything else', () => {
    expect(() => parseDirectorySearch(null)).toThrow()
    expect(() => parseDirectorySearch({ ...emptySearch, skills: [1] })).toThrow()
    expect(() =>
      parseDirectorySearch({ ...emptySearch, seniorities: ['principal'] }),
    ).toThrow()
    expect(() =>
      parseDirectorySearch({ ...emptySearch, jobSearchStatuses: 'notLooking' }),
    ).toThrow()
  })
})

describe('a search in the URL', () => {
  it('is read keeping what it understands and dropping the rest', () => {
    expect(
      searchFromUrl({
        skills: ['React', 3],
        targetRoles: 'SRE',
        seniorities: ['senior', 'principal'],
        jobSearchStatuses: { notLooking: true },
        page: 2,
      }),
    ).toEqual({
      skills: ['React'],
      targetRoles: ['SRE'],
      seniorities: ['senior'],
      jobSearchStatuses: [],
    })
    expect(searchFromUrl({})).toEqual(emptySearch)
  })

  it('is written with only the filters in use', () => {
    const search = { ...emptySearch, skills: ['React'], seniorities: ['senior' as const] }

    expect(searchToUrl(search)).toEqual({ skills: ['React'], seniorities: ['senior'] })
    expect(searchToUrl(emptySearch)).toEqual({})
    expect(searchFromUrl(searchToUrl(search))).toEqual(search)
  })
})
