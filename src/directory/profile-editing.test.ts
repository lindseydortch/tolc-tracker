import { describe, expect, it } from 'vitest'
import { memberWithProfile, octoForm, seededSetup } from './test-profiles'

describe('Secondary Skills', () => {
  it('can be added and removed', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')

    expect(
      await setup.directory.addSkill({ authUserId, skill: 'docker' }),
    ).toEqual({ ok: true })
    expect((await setup.directory.profileForEditing(authUserId)).techStack).toEqual([
      { name: 'Docker', stackLayer: null },
      { name: 'PostgreSQL', stackLayer: 'database' },
      { name: 'React', stackLayer: 'frontendFramework' },
    ])

    expect(
      await setup.directory.removeSkill({ authUserId, skill: 'Docker' }),
    ).toEqual({ ok: true })
    expect((await setup.directory.profileForEditing(authUserId)).techStack).toEqual([
      { name: 'PostgreSQL', stackLayer: 'database' },
      { name: 'React', stackLayer: 'frontendFramework' },
    ])
  })
})

describe('adding a Skill to the Preferred Stack', () => {
  it('puts it in the chosen Stack Layer', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')

    expect(
      await setup.directory.addSkill({
        authUserId,
        skill: 'node',
        stackLayer: 'backendLanguage',
      }),
    ).toEqual({ ok: true })

    const [entry] = await setup.directory.listDirectory()
    expect(entry.preferredStack).toEqual({
      frontendFramework: 'React',
      backendLanguage: 'Node.js',
      database: 'PostgreSQL',
    })
  })

  it('asks before replacing an occupied Stack Layer, then makes the replaced Skill Secondary', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')
    const addVue = (replace?: boolean) =>
      setup.directory.addSkill({
        authUserId,
        skill: 'Vue',
        stackLayer: 'frontendFramework',
        replace,
      })

    expect(await addVue()).toEqual({ ok: false, occupiedBy: 'React' })
    expect((await setup.directory.profileForEditing(authUserId)).techStack).toEqual([
      { name: 'PostgreSQL', stackLayer: 'database' },
      { name: 'React', stackLayer: 'frontendFramework' },
    ])

    expect(await addVue(true)).toEqual({ ok: true })
    expect((await setup.directory.profileForEditing(authUserId)).techStack).toEqual([
      { name: 'PostgreSQL', stackLayer: 'database' },
      { name: 'React', stackLayer: null },
      { name: 'Vue', stackLayer: 'frontendFramework' },
    ])
  })

  it('moves a Skill already in the Tech Stack into the Stack Layer', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')
    await setup.directory.addSkill({ authUserId, skill: 'Go' })

    await setup.directory.addSkill({ authUserId, skill: 'Go', stackLayer: 'backendLanguage' })
    // Re-adding a Primary Skill without a Stack Layer leaves it Primary.
    await setup.directory.addSkill({ authUserId, skill: 'React' })
    // Moving a Primary Skill to another Stack Layer frees its old one.
    await setup.directory.addSkill({ authUserId, skill: 'Postgres', stackLayer: 'backendFramework' })

    expect((await setup.directory.profileForEditing(authUserId)).techStack).toEqual([
      { name: 'Go', stackLayer: 'backendLanguage' },
      { name: 'PostgreSQL', stackLayer: 'backendFramework' },
      { name: 'React', stackLayer: 'frontendFramework' },
    ])
  })

  it('never puts TypeScript in a Stack Layer', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')

    expect(
      await setup.directory.addSkill({ authUserId, skill: 'ts', stackLayer: 'backendLanguage' }),
    ).toEqual({ ok: false, problem: 'TypeScript can never fill a Stack Layer' })
    expect((await setup.directory.profileForEditing(authUserId)).techStack).toHaveLength(2)
  })
})

describe('removing a Skill', () => {
  it('keeps at least one Skill in the Preferred Stack', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')

    expect(await setup.directory.removeSkill({ authUserId, skill: 'React' })).toEqual({
      ok: true,
    })
    expect(
      await setup.directory.removeSkill({ authUserId, skill: 'PostgreSQL' }),
    ).toEqual({
      ok: false,
      problem: 'Your Preferred Stack needs at least one Skill. Add another before removing PostgreSQL.',
    })
    expect(await setup.directory.listDirectory()).toHaveLength(1)
  })
})

describe('the TypeScript Badge', () => {
  it('adds TypeScript as a Secondary Skill when switched on, and removes it when switched off', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')
    const profile = () => setup.directory.profileForEditing(authUserId)
    expect((await profile()).typeScriptBadge).toBe(false)

    await setup.directory.setTypeScriptBadge({ authUserId, on: true })
    expect((await profile()).typeScriptBadge).toBe(true)
    expect((await profile()).techStack).toContainEqual({
      name: 'TypeScript',
      stackLayer: null,
    })

    await setup.directory.setTypeScriptBadge({ authUserId, on: false })
    expect((await profile()).typeScriptBadge).toBe(false)
    expect((await profile()).techStack.map((skill) => skill.name)).not.toContain(
      'TypeScript',
    )
  })

  it('follows TypeScript being added or removed as a Secondary Skill', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')
    const badge = async () =>
      (await setup.directory.profileForEditing(authUserId)).typeScriptBadge

    await setup.directory.addSkill({ authUserId, skill: 'TS' })
    expect(await badge()).toBe(true)
    await setup.directory.removeSkill({ authUserId, skill: 'TypeScript' })
    expect(await badge()).toBe(false)
  })
})

describe('a Skill not in the Skill Catalog', () => {
  it('is created when a Member adds it', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')

    expect(await setup.directory.addSkill({ authUserId, skill: '  Gleam ' })).toEqual({
      ok: true,
    })
    // A second spelling resolves to the new entry instead of duplicating it.
    await setup.directory.addSkill({ authUserId, skill: 'gleam' })

    const catalog = await setup.directory.skillCatalog()
    expect(catalog.filter((skill) => skill.name === 'Gleam')).toEqual([
      { name: 'Gleam', suggestedLayer: null, aliases: [] },
    ])
    expect((await setup.directory.profileForEditing(authUserId)).techStack).toContainEqual({
      name: 'Gleam',
      stackLayer: null,
    })
  })

  it('takes the Stack Layer it is first added to as its suggested Layer', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')

    await setup.directory.addSkill({ authUserId, skill: 'Gleam', stackLayer: 'backendLanguage' })

    expect(await setup.directory.skillCatalog()).toContainEqual({
      name: 'Gleam',
      suggestedLayer: 'backendLanguage',
      aliases: [],
    })
  })

  it('is not created while the Member is still deciding whether to replace', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')

    expect(
      await setup.directory.addSkill({
        authUserId,
        skill: 'Mithril',
        stackLayer: 'frontendFramework',
      }),
    ).toEqual({ ok: false, occupiedBy: 'React' })

    const names = (await setup.directory.skillCatalog()).map((skill) => skill.name)
    expect(names).not.toContain('Mithril')
  })

  it('needs a name', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')

    expect(await setup.directory.addSkill({ authUserId, skill: ' .- ' })).toEqual({
      ok: false,
      problem: 'Enter a Skill name',
    })
  })
})

describe('editing the details', () => {
  it('starts from the saved profile and saves changes, creating new Target Roles', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')
    const { details } = await setup.directory.profileForEditing(authUserId)
    const { preferredStack, ...octoDetails } = octoForm
    expect(details).toEqual(octoDetails)

    expect(
      await setup.directory.updateDetails({
        authUserId,
        form: { ...details, lastName: 'Kitten', targetRoles: ['SWE', 'Prompt Whisperer'] },
      }),
    ).toEqual({ ok: true })

    const [entry] = await setup.directory.listDirectory()
    expect(entry.lastName).toBe('Kitten')
    expect(entry.targetRoles).toEqual(['Prompt Whisperer', 'Software Engineer'])
    expect(entry.preferredStack).toEqual(preferredStack)
    expect(await setup.directory.roleCatalog()).toContainEqual({
      name: 'Prompt Whisperer',
      aliases: [],
    })
  })

  it('blocks incomplete details', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')
    const { details } = await setup.directory.profileForEditing(authUserId)

    expect(
      await setup.directory.updateDetails({
        authUserId,
        form: { ...details, firstName: ' ', targetRoles: [] },
      }),
    ).toEqual({
      ok: false,
      problems: { firstName: expect.any(String), targetRoles: expect.any(String) },
    })
    expect((await setup.directory.listDirectory())[0].firstName).toBe('Octo')
  })
})

describe('Links', () => {
  it('adds, edits and removes the optional Links and Custom Links', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')
    const savedLinks = async () =>
      (await setup.directory.profileForEditing(authUserId)).links

    expect(await savedLinks()).toEqual({ resume: '', portfolio: '', bluesky: '', custom: [] })

    expect(
      await setup.directory.saveLinks({
        authUserId,
        links: {
          resume: 'octo.dev/resume.pdf',
          portfolio: 'https://octo.dev',
          bluesky: 'https://bsky.app/profile/octo.dev',
          custom: [
            { label: 'My talk', url: 'https://youtu.be/talk' },
            { label: ' Side project ', url: 'github.com/octocat/hello' },
          ],
        },
      }),
    ).toEqual({ ok: true })
    expect(await savedLinks()).toEqual({
      resume: 'https://octo.dev/resume.pdf',
      portfolio: 'https://octo.dev/',
      bluesky: 'https://bsky.app/profile/octo.dev',
      custom: [
        { label: 'My talk', url: 'https://youtu.be/talk' },
        { label: 'Side project', url: 'https://github.com/octocat/hello' },
      ],
    })

    await setup.directory.saveLinks({
      authUserId,
      links: {
        resume: 'https://octo.dev/cv.pdf',
        portfolio: '',
        bluesky: ' ',
        custom: [{ label: 'Side project', url: 'https://github.com/octocat/hello' }],
      },
    })
    expect(await savedLinks()).toEqual({
      resume: 'https://octo.dev/cv.pdf',
      portfolio: '',
      bluesky: '',
      custom: [{ label: 'Side project', url: 'https://github.com/octocat/hello' }],
    })
    // The required Links are not touched.
    const member = await setup.directory.memberForAuthUser(authUserId)
    expect(member?.links.map((link) => link.kind).sort()).toEqual([
      'custom',
      'github',
      'linkedin',
      'resume',
    ])
  })

  it('rejects Links that are not URLs, and saves nothing', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')

    expect(
      await setup.directory.saveLinks({
        authUserId,
        links: {
          resume: 'my resume',
          portfolio: 'ftp://octo.dev',
          bluesky: 'https://twitter.com/octo',
          custom: [
            { label: 'Fine', url: 'https://octo.dev' },
            { label: '', url: 'https://octo.dev/blog' },
            { label: 'No URL', url: '' },
          ],
        },
      }),
    ).toEqual({
      ok: false,
      problems: {
        resume: 'Enter your resume as a URL',
        portfolio: 'Enter a URL',
        bluesky: 'Enter your Bluesky profile URL',
        custom: [undefined, 'Enter a label', 'Enter a URL'],
      },
    })
    expect((await setup.directory.profileForEditing(authUserId)).links.custom).toEqual([])
  })
})

describe('who can edit a profile', () => {
  // Every edit is made as a signed-in Member and names no other Member, so
  // the Admin, who signs in like anyone else, can only edit their own.
  it('only ever changes the signed-in Member’s own profile', async () => {
    const setup = await seededSetup()
    const octo = await memberWithProfile(setup, 'octocat')
    const admin = await memberWithProfile(setup, 'tolc-admin')
    const octoBefore = await setup.directory.profileForEditing(octo.authUserId)

    const asAdmin = { authUserId: admin.authUserId }
    await setup.directory.updateDetails({
      ...asAdmin,
      form: { ...octoBefore.details, firstName: 'Admin' },
    })
    await setup.directory.addSkill({ ...asAdmin, skill: 'Vue', stackLayer: 'frontendFramework', replace: true })
    await setup.directory.addSkill({ ...asAdmin, skill: 'Docker' })
    await setup.directory.removeSkill({ ...asAdmin, skill: 'PostgreSQL' })
    await setup.directory.setTypeScriptBadge({ ...asAdmin, on: true })
    await setup.directory.saveLinks({
      ...asAdmin,
      links: { resume: 'https://admin.dev/cv', portfolio: '', bluesky: '', custom: [] },
    })

    expect(await setup.directory.profileForEditing(octo.authUserId)).toEqual(octoBefore)
    expect(
      (await setup.directory.profileForEditing(admin.authUserId)).details.firstName,
    ).toBe('Admin')
  })

  it('refuses edits from someone who never signed in', async () => {
    const setup = await seededSetup()

    await expect(
      setup.directory.addSkill({ authUserId: 'nobody', skill: 'Docker' }),
    ).rejects.toThrow('No Member for auth user "nobody"')
    await expect(setup.directory.profileForEditing('nobody')).rejects.toThrow()
  })
})
