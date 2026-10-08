import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { memberWantsToWorkFrom, memberWorkArrangements, members } from '../db/schema'
import { emptyLocation, emptyPlace, placeName } from './location'
import { emptyForm, profileProblems } from './profile'
import { parseDetailsForm, parseProfileForm } from './profile-parsing'
import { emptySearch } from './search'
import { memberInTolc, memberWithProfile, octoForm, seededSetup } from './test-profiles'

async function seededCatalogs() {
  return (await seededSetup()).directory.catalogs()
}

describe('Work Arrangement and Location on the signup form', () => {
  it('requires a Work Arrangement, City, Country and Time Zone, but not State/Region', async () => {
    const catalogs = await seededCatalogs()
    const problems = profileProblems(
      {
        ...octoForm,
        workArrangements: [],
        location: { city: ' ', region: '', country: '', timeZone: '' },
      },
      catalogs,
    )
    expect(Object.keys(problems).sort()).toEqual([
      'city',
      'country',
      'timeZone',
      'workArrangements',
    ])
    expect(
      profileProblems({ ...octoForm, location: { ...octoForm.location, region: '' } }, catalogs),
    ).toEqual({})
  })

  it('only accepts an IANA Time Zone', async () => {
    const catalogs = await seededCatalogs()
    const problemFor = (timeZone: string) =>
      profileProblems({ ...octoForm, location: { ...octoForm.location, timeZone } }, catalogs)
        .timeZone
    expect(problemFor('Mars/Olympus_Mons')).toBeDefined()
    expect(problemFor('America/Chicago')).toBeUndefined()
    expect(problemFor('Europe/Rome')).toBeUndefined()
  })

  it('needs a Country for each Wants to Work From place, and drops blank ones', async () => {
    const catalogs = await seededCatalogs()
    const problemFor = (wantsToWorkFrom: typeof octoForm.wantsToWorkFrom) =>
      profileProblems({ ...octoForm, wantsToWorkFrom }, catalogs).wantsToWorkFrom
    expect(problemFor([{ ...emptyPlace, city: 'Rome' }])).toBeDefined()
    expect(problemFor([{ ...emptyPlace, country: 'Italy' }])).toBeUndefined()
    expect(problemFor([{ city: ' ', region: '', country: ' ' }])).toBeUndefined()
    expect(problemFor([])).toBeUndefined()
  })

  it('starts with no Work Arrangement, no Wants to Work From, and not Willing to Relocate', () => {
    expect(emptyForm.workArrangements).toEqual([])
    expect(emptyForm.wantsToWorkFrom).toEqual([])
    expect(emptyForm.willingToRelocate).toBe(false)
  })
})

describe('the new fields sent to the server', () => {
  it('pass through when well-formed', () => {
    const form = {
      ...octoForm,
      workArrangements: ['inPerson'],
      wantsToWorkFrom: [{ city: 'Rome', region: 'Lazio', country: 'Italy' }],
      willingToRelocate: true,
    }
    expect(parseProfileForm(form)).toEqual(form)
    expect(parseDetailsForm(form)).toEqual(
      Object.fromEntries(Object.entries(form).filter(([key]) => key !== 'preferredStack')),
    )
  })

  it('are rejected when malformed', () => {
    expect(() => parseProfileForm({ ...octoForm, workArrangements: ['office'] })).toThrow(
      'workArrangements',
    )
    expect(() => parseProfileForm({ ...octoForm, location: null })).toThrow(
      'Malformed Location',
    )
    expect(() =>
      parseProfileForm({ ...octoForm, location: { ...octoForm.location, timeZone: 3 } }),
    ).toThrow('timeZone')
    expect(() => parseProfileForm({ ...octoForm, willingToRelocate: 'no' })).toThrow(
      'willingToRelocate',
    )
    expect(() =>
      parseProfileForm({ ...octoForm, wantsToWorkFrom: [{ country: 'Italy' }] }),
    ).toThrow('Malformed Wants to Work From place: city')
  })
})

describe('a place name', () => {
  it('joins the parts that are filled', () => {
    expect(placeName({ city: 'Austin', region: 'TX', country: 'United States' })).toBe(
      'Austin, TX, United States',
    )
    expect(placeName({ city: '', region: '', country: 'Italy' })).toBe('Italy')
    expect(placeName({ city: 'Rome', region: '', country: 'Italy' })).toBe('Rome, Italy')
  })
})

describe('saving Work Arrangement and Location', () => {
  it('puts them on the card', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberInTolc(setup, 'octocat')

    await setup.directory.completeProfile({
      authUserId,
      form: {
        ...octoForm,
        workArrangements: ['inPerson', 'remote'],
        location: { ...octoForm.location, city: '  Austin ' },
        wantsToWorkFrom: [
          { ...emptyPlace, country: ' Italy ' },
          emptyPlace,
          { ...emptyPlace, city: 'Lisbon', country: 'Portugal' },
        ],
        willingToRelocate: true,
      },
    })

    const [entry] = await setup.directory.searchDirectory(emptySearch)
    expect(entry).toMatchObject({
      // In the order the Work Arrangement enum declares them.
      workArrangements: ['remote', 'inPerson'],
      location: {
        city: 'Austin',
        region: 'TX',
        country: 'United States',
        timeZone: 'America/Chicago',
      },
      wantsToWorkFrom: [
        { ...emptyPlace, country: 'Italy' },
        { ...emptyPlace, city: 'Lisbon', country: 'Portugal' },
      ],
      willingToRelocate: true,
    })
    const page = await setup.directory.memberProfile(entry.id)
    expect(page?.wantsToWorkFrom).toEqual(entry.wantsToWorkFrom)
  })

  it('shows them on Edit Profile and replaces them when the details are saved', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')
    const { details } = await setup.directory.profileForEditing(authUserId)
    expect(details).toMatchObject({
      workArrangements: octoForm.workArrangements,
      location: octoForm.location,
      wantsToWorkFrom: [],
      willingToRelocate: false,
    })

    expect(
      await setup.directory.updateDetails({
        authUserId,
        form: {
          ...details,
          workArrangements: ['hybrid'],
          location: { city: 'Rome', region: '', country: 'Italy', timeZone: 'Europe/Rome' },
          wantsToWorkFrom: [{ ...emptyPlace, country: 'Spain' }],
          willingToRelocate: true,
        },
      }),
    ).toEqual({ ok: true })

    expect((await setup.directory.profileForEditing(authUserId)).details).toMatchObject({
      workArrangements: ['hybrid'],
      location: { city: 'Rome', region: '', country: 'Italy', timeZone: 'Europe/Rome' },
      wantsToWorkFrom: [{ ...emptyPlace, country: 'Spain' }],
      willingToRelocate: true,
    })
  })

  it('blocks saving the details without them', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')
    const { details } = await setup.directory.profileForEditing(authUserId)

    const result = await setup.directory.updateDetails({
      authUserId,
      form: { ...details, workArrangements: [], location: { ...details.location, country: '' } },
    })

    expect(result).toEqual({
      ok: false,
      problems: { workArrangements: expect.any(String), country: expect.any(String) },
    })
  })
})

// Members who signed up before Work Arrangement and Location existed.
describe('a Member without Work Arrangement or Location', () => {
  async function earlyMember() {
    const setup = await seededSetup()
    const member = await memberWithProfile(setup, 'octocat')
    await setup.db
      .update(members)
      .set({ city: null, region: null, country: null, timeZone: null })
      .where(eq(members.authUserId, member.authUserId))
    await setup.db.delete(memberWorkArrangements)
    await setup.db.delete(memberWantsToWorkFrom)
    return { setup, ...member }
  }

  it('stays in the Directory, with those lines left off the card', async () => {
    const { setup, authUserId } = await earlyMember()

    expect(await setup.directory.isProfileComplete(authUserId)).toBe(true)
    const [entry] = await setup.directory.searchDirectory(emptySearch)
    expect(entry).toMatchObject({
      workArrangements: [],
      location: null,
      wantsToWorkFrom: [],
      willingToRelocate: false,
    })
  })

  it('is asked to add them until they do', async () => {
    const { setup, authUserId } = await earlyMember()
    expect(await setup.directory.needsLocationAndWorkArrangement(authUserId)).toBe(true)

    const { details } = await setup.directory.profileForEditing(authUserId)
    expect(details).toMatchObject({ workArrangements: [], location: emptyLocation })
    await setup.directory.updateDetails({
      authUserId,
      form: {
        ...details,
        workArrangements: octoForm.workArrangements,
        location: octoForm.location,
      },
    })

    expect(await setup.directory.needsLocationAndWorkArrangement(authUserId)).toBe(false)
  })

  it('is not asked once signed up with them', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')
    expect(await setup.directory.needsLocationAndWorkArrangement(authUserId)).toBe(false)
  })
})
