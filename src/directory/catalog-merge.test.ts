import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { skillAliases } from '../db/schema'
import { mergeEntries, NotAdminError } from './catalog-merge'
import { normalizeName } from './normalize-name'
import { emptySearch } from './search'
import { starterCatalogs } from './starter-catalogs'
import { createTestSetup, testAdminDiscordUserId } from './test-directory'
import {
  memberInTolc,
  memberWithProfile,
  octoForm,
  seededSetup,
  type TestSetup,
} from './test-profiles'

async function adminAndSetup() {
  const setup = await seededSetup()
  const admin = await memberWithProfile(setup, 'tolc-owner', testAdminDiscordUserId)
  return { setup, admin: admin.authUserId }
}

async function techStack(setup: TestSetup, authUserId: string) {
  return (await setup.directory.profileForEditing(authUserId)).techStack
}

async function catalogSkill(setup: TestSetup, name: string) {
  return (await setup.directory.skillCatalog()).find((skill) => skill.name === name)
}

async function catalogRole(setup: TestSetup, name: string) {
  return (await setup.directory.roleCatalog()).find((role) => role.name === name)
}

describe('recognising the Admin', () => {
  it('is the Member whose Discord user ID is configured', async () => {
    const { setup, admin } = await adminAndSetup()
    const { authUserId: other } = await memberWithProfile(setup, 'octocat')

    expect(await setup.directory.isAdmin(admin)).toBe(true)
    expect(await setup.directory.isAdmin(other)).toBe(false)
  })

  it('is no one when no Admin is configured', async () => {
    const setup = await createTestSetup({ adminDiscordUserId: null })
    await setup.directory.seedCatalogs(starterCatalogs)
    const { authUserId } = await memberInTolc(setup, 'tolc-owner', testAdminDiscordUserId)

    expect(await setup.directory.isAdmin(authUserId)).toBe(false)
  })

  it('is no one once the Admin has left TOLC', async () => {
    const { setup, admin } = await adminAndSetup()
    setup.tolc.leave(testAdminDiscordUserId)
    const later = new Date(Date.now() + 60_000)
    await setup.directory.refreshMembership({
      authUserId: admin,
      sessionStartedAt: later,
      now: later,
    })

    expect(await setup.directory.isAdmin(admin)).toBe(false)
    await expect(
      setup.directory.mergeSkills({ authUserId: admin, from: 'Vue', into: 'React' }),
    ).rejects.toThrow(NotAdminError)
  })

  it('is no one without Discord connected', async () => {
    const setup = await seededSetup()
    const authUserId = await setup.signUpWithGitHub('octocat')
    await setup.directory.signIn({ authUserId, githubUsername: 'octocat' })

    expect(await setup.directory.isAdmin(authUserId)).toBe(false)
  })
})

describe('only the Admin can merge', () => {
  it('refuses any other Member and leaves the Catalogs alone', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')

    await expect(
      setup.directory.mergeSkills({ authUserId, from: 'Vue', into: 'React' }),
    ).rejects.toThrow(NotAdminError)
    await expect(
      setup.directory.mergeTargetRoles({
        authUserId,
        from: 'Backend Engineer',
        into: 'Software Engineer',
      }),
    ).rejects.toThrow(NotAdminError)

    expect(await catalogSkill(setup, 'Vue')).toBeDefined()
    expect(await catalogRole(setup, 'Backend Engineer')).toBeDefined()
  })
})

describe('merging Skills', () => {
  it("makes the merged Skill's name and Aliases into Aliases, then removes it", async () => {
    const { setup, admin } = await adminAndSetup()
    await setup.directory.addSkill({ authUserId: admin, skill: 'React Library' })

    expect(
      await setup.directory.mergeSkills({ authUserId: admin, from: 'React Library', into: 'React' }),
    ).toEqual({ ok: true })
    expect(
      await setup.directory.mergeSkills({ authUserId: admin, from: 'Postgres', into: 'MySQL' }),
    ).toEqual({ ok: true })

    expect(await catalogSkill(setup, 'React Library')).toBeUndefined()
    expect((await catalogSkill(setup, 'React'))?.aliases).toContain('React Library')
    expect(await catalogSkill(setup, 'PostgreSQL')).toBeUndefined()
    expect((await catalogSkill(setup, 'MySQL'))?.aliases).toEqual(
      expect.arrayContaining(['PostgreSQL', 'Postgres', 'pg', 'psql']),
    )
  })

  it('moves every Member using it onto the Skill it was merged into', async () => {
    const { setup, admin } = await adminAndSetup()
    const { authUserId: octo } = await memberWithProfile(setup, 'octocat')
    await setup.directory.addSkill({ authUserId: octo, skill: 'React Library' })
    await setup.directory.addSkill({
      authUserId: octo,
      skill: 'Gleam Lang',
      stackLayer: 'backendLanguage',
    })

    await setup.directory.mergeSkills({ authUserId: admin, from: 'React Library', into: 'Vue' })
    await setup.directory.mergeSkills({ authUserId: admin, from: 'Gleam Lang', into: 'Go' })

    expect(await techStack(setup, octo)).toEqual([
      { name: 'Go', stackLayer: 'backendLanguage' },
      { name: 'PostgreSQL', stackLayer: 'database' },
      { name: 'React', stackLayer: 'frontendFramework' },
      { name: 'Vue', stackLayer: null },
    ])
  })

  it('leaves a Member who had both with one entry, keeping a Stack Layer from either', async () => {
    const { setup, admin } = await adminAndSetup()
    // Octo has React in Frontend Framework and Vue as a Secondary Skill.
    const { authUserId: octo } = await memberWithProfile(setup, 'octocat')
    await setup.directory.addSkill({ authUserId: octo, skill: 'Vue' })
    // Mona has Vue in Frontend Framework and React as a Secondary Skill.
    const { authUserId: mona } = await memberInTolc(setup, 'mona')
    await setup.directory.completeProfile({
      authUserId: mona,
      form: { ...octoForm, preferredStack: { frontendFramework: 'Vue' } },
    })
    await setup.directory.addSkill({ authUserId: mona, skill: 'React' })

    await setup.directory.mergeSkills({ authUserId: admin, from: 'React', into: 'Vue' })

    expect(await techStack(setup, octo)).toEqual([
      { name: 'PostgreSQL', stackLayer: 'database' },
      { name: 'Vue', stackLayer: 'frontendFramework' },
    ])
    expect(await techStack(setup, mona)).toEqual([
      { name: 'Vue', stackLayer: 'frontendFramework' },
    ])
  })

  it('keeps the Stack Layer of the Skill merged into when both filled one', async () => {
    const { setup, admin } = await adminAndSetup()
    const { authUserId: octo } = await memberWithProfile(setup, 'octocat')
    await setup.directory.addSkill({
      authUserId: octo,
      skill: 'Node.js',
      stackLayer: 'backendLanguage',
    })
    await setup.directory.addSkill({
      authUserId: octo,
      skill: 'Express',
      stackLayer: 'backendFramework',
    })

    await setup.directory.mergeSkills({ authUserId: admin, from: 'Express', into: 'Node.js' })

    expect(await techStack(setup, octo)).toEqual([
      { name: 'Node.js', stackLayer: 'backendLanguage' },
      { name: 'PostgreSQL', stackLayer: 'database' },
      { name: 'React', stackLayer: 'frontendFramework' },
    ])
  })

  it("resolves the merged Skill's old name to the Skill it was merged into", async () => {
    const { setup, admin } = await adminAndSetup()
    const { authUserId: octo } = await memberWithProfile(setup, 'octocat')
    await setup.directory.addSkill({ authUserId: octo, skill: 'Vue' })

    await setup.directory.mergeSkills({ authUserId: admin, from: 'Vue', into: 'React' })

    await setup.directory.addSkill({ authUserId: admin, skill: 'vue.js' })
    expect(await techStack(setup, admin)).toEqual([
      { name: 'PostgreSQL', stackLayer: 'database' },
      { name: 'React', stackLayer: 'frontendFramework' },
    ])
    const found = await setup.directory.searchDirectory({ ...emptySearch, skills: ['Vue'] })
    expect(found.map((entry) => entry.firstName)).toEqual(['Octo', 'Octo'])
  })

  it('names a Skill the Catalog lacks, or two names for the same Skill', async () => {
    const { setup, admin } = await adminAndSetup()

    expect(
      await setup.directory.mergeSkills({ authUserId: admin, from: 'Nope', into: 'React' }),
    ).toEqual({ ok: false, problem: 'The Skill Catalog has no "Nope"' })
    expect(
      await setup.directory.mergeSkills({ authUserId: admin, from: 'React', into: '' }),
    ).toEqual({ ok: false, problem: 'The Skill Catalog has no ""' })
    expect(
      await setup.directory.mergeSkills({ authUserId: admin, from: 'ReactJS', into: 'react' }),
    ).toEqual({ ok: false, problem: '"ReactJS" and "react" are both React' })
  })

  it('keeps TypeScript out of the Stack Layers', async () => {
    const { setup, admin } = await adminAndSetup()
    const { authUserId: octo } = await memberWithProfile(setup, 'octocat')
    await setup.directory.addSkill({
      authUserId: octo,
      skill: 'Deno',
      stackLayer: 'backendLanguage',
    })

    expect(
      await setup.directory.mergeSkills({ authUserId: admin, from: 'TypeScript', into: 'Deno' }),
    ).toEqual({
      ok: false,
      problem: 'TypeScript backs the TypeScript Badge, so it can only be merged into',
    })
    expect(
      await setup.directory.mergeSkills({ authUserId: admin, from: 'Deno', into: 'TypeScript' }),
    ).toEqual({
      ok: false,
      problem: 'Deno fills a Stack Layer for a Member, and TypeScript never can',
    })
    expect(await catalogSkill(setup, 'Deno')).toBeDefined()
  })
})

describe('a merge that would make a name ambiguous', () => {
  // The Directory never lets a Skill's name match another Skill's Alias,
  // so older data has to set this up directly.
  async function aliasFor(setup: TestSetup, owner: string, alias: string) {
    const skill = (await setup.directory.skillCatalog()).find((s) => s.name === owner)
    if (!skill) throw new Error(`No Skill ${owner}`)
    const [{ id }] = await setup.db
      .select({ id: skillAliases.skillId })
      .from(skillAliases)
      .where(eq(skillAliases.normalizedName, normalizeName(skill.aliases[0])))
    await setup.db
      .insert(skillAliases)
      .values({ skillId: id, name: alias, normalizedName: normalizeName(alias) })
  }

  it("is refused when the merged Skill's name is another Skill's Alias", async () => {
    const { setup, admin } = await adminAndSetup()
    await setup.directory.addSkill({ authUserId: admin, skill: 'Reactish' })
    await aliasFor(setup, 'Vue', 'reactish')

    expect(
      await setup.directory.mergeSkills({ authUserId: admin, from: 'Reactish', into: 'React' }),
    ).toEqual({ ok: false, problem: '"Reactish" is already an Alias of Vue' })
    expect(await catalogSkill(setup, 'Reactish')).toBeDefined()
  })

  it("goes ahead when the name is already an Alias of the Skill merged into", async () => {
    const { setup, admin } = await adminAndSetup()
    await setup.directory.addSkill({ authUserId: admin, skill: 'Reactish' })
    await aliasFor(setup, 'React', 'reactish')

    expect(
      await setup.directory.mergeSkills({ authUserId: admin, from: 'Reactish', into: 'React' }),
    ).toEqual({ ok: true })
    expect((await catalogSkill(setup, 'React'))?.aliases).toEqual(['ReactJS', 'reactish'])
  })
})

describe('a merge racing another merge', () => {
  it('asks to try again when an entry vanished before it could be locked', async () => {
    const entries = [
      { id: 1, name: 'Vue', normalizedName: 'vue' },
      { id: 2, name: 'React', normalizedName: 'react' },
    ]
    const result = await mergeEntries(
      { from: 'Vue', into: 'React' },
      {
        catalog: 'Skill Catalog',
        find: async (typed) => entries.find((e) => e.name === typed) ?? null,
        // Another merge removed Vue in the meantime.
        lock: async () => [entries[1]],
        aliasOwner: async () => null,
        moveMembers: async () => expect.fail('nothing should move'),
        absorb: async () => expect.fail('nothing should move'),
      },
    )

    expect(result).toEqual({ ok: false, problem: 'The Skill Catalog just changed. Try again.' })
  })
})

describe('merging Target Roles', () => {
  it('works the same way as Skills', async () => {
    const { setup, admin } = await adminAndSetup()
    const { authUserId: mona } = await memberInTolc(setup, 'mona')
    await setup.directory.completeProfile({
      authUserId: mona,
      form: { ...octoForm, targetRoles: ['Software Engineer', 'SWE Generalist'] },
    })
    const { authUserId: hubot } = await memberInTolc(setup, 'hubot')
    await setup.directory.completeProfile({
      authUserId: hubot,
      form: { ...octoForm, targetRoles: ['SWE Generalist'] },
    })

    expect(
      await setup.directory.mergeTargetRoles({
        authUserId: admin,
        from: 'SWE Generalist',
        into: 'Software Engineer',
      }),
    ).toEqual({ ok: true })

    expect(await catalogRole(setup, 'SWE Generalist')).toBeUndefined()
    expect((await catalogRole(setup, 'Software Engineer'))?.aliases).toContain('SWE Generalist')
    for (const authUserId of [mona, hubot]) {
      expect((await setup.directory.profileForEditing(authUserId)).details.targetRoles).toEqual([
        'Software Engineer',
      ])
    }
    const found = await setup.directory.searchDirectory({
      ...emptySearch,
      targetRoles: ['swe generalist'],
    })
    expect(found).toHaveLength(3)

    const { details } = await setup.directory.profileForEditing(admin)
    await setup.directory.updateDetails({
      authUserId: admin,
      form: { ...details, targetRoles: ['Software Engineer', 'swe-generalist'] },
    })
    expect((await setup.directory.profileForEditing(admin)).details.targetRoles).toEqual([
      'Software Engineer',
    ])
  })

  it('names a Target Role the Catalog lacks, or two names for the same one', async () => {
    const { setup, admin } = await adminAndSetup()

    expect(
      await setup.directory.mergeTargetRoles({ authUserId: admin, from: 'Nope', into: 'SRE' }),
    ).toEqual({ ok: false, problem: 'The Role Catalog has no "Nope"' })
    expect(
      await setup.directory.mergeTargetRoles({
        authUserId: admin,
        from: 'SRE',
        into: 'Site Reliability Engineer',
      }),
    ).toEqual({
      ok: false,
      problem: '"SRE" and "Site Reliability Engineer" are both Site Reliability Engineer',
    })
  })
})
