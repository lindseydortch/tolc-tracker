import { describe, expect, it } from 'vitest'
import { createTestDirectory } from './test-directory'
import { starterCatalogs } from './starter-catalogs'

describe('seeding the Catalogs', () => {
  it('loads the starter Skill Catalog and Role Catalog', async () => {
    const directory = await createTestDirectory()

    await directory.seedCatalogs(starterCatalogs)

    const skills = await directory.skillCatalog()
    const roles = await directory.roleCatalog()
    expect(skills).toHaveLength(123)
    expect(roles).toHaveLength(16)
    expect(skills).toContainEqual({
      name: 'PostgreSQL',
      suggestedLayer: 'database',
      aliases: ['Postgres', 'pg', 'psql'],
    })
    expect(skills).toContainEqual({
      name: 'TypeScript',
      suggestedLayer: null,
      aliases: ['TS'],
    })
    expect(roles).toContainEqual({
      name: 'Site Reliability Engineer',
      aliases: ['SRE'],
    })
  })
  it('creates no duplicates when seeded again, and adds new seed entries', async () => {
    const directory = await createTestDirectory()
    await directory.seedCatalogs(starterCatalogs)

    await directory.seedCatalogs({
      skills: [
        ...starterCatalogs.skills,
        { name: 'Gleam', suggestedLayer: 'backendLanguage', aliases: [] },
      ],
      roles: starterCatalogs.roles,
    })

    const skills = await directory.skillCatalog()
    expect(skills).toHaveLength(124)
    expect(skills).toContainEqual({
      name: 'React',
      suggestedLayer: 'frontendFramework',
      aliases: ['ReactJS'],
    })
    expect(await directory.roleCatalog()).toHaveLength(16)
  })
  it('never recreates an entry that already exists as an Alias', async () => {
    const directory = await createTestDirectory()
    await directory.seedCatalogs({
      skills: [{ name: 'Next.js', aliases: ['Nextjs Framework'] }],
      roles: [{ name: 'Software Engineer', aliases: ['SWE'] }],
    })

    await directory.seedCatalogs({
      skills: [{ name: 'nextjs-framework', aliases: [] }],
      roles: [{ name: 'swe', aliases: [] }],
    })

    expect(await directory.skillCatalog()).toEqual([
      { name: 'Next.js', suggestedLayer: null, aliases: ['Nextjs Framework'] },
    ])
    expect(await directory.roleCatalog()).toEqual([
      { name: 'Software Engineer', aliases: ['SWE'] },
    ])
  })

  it('rejects a seed Alias that already names a different entry', async () => {
    const directory = await createTestDirectory()

    await expect(
      directory.seedCatalogs({
        skills: [
          { name: 'Vue', aliases: [] },
          { name: 'Nuxt', aliases: ['vue'] },
        ],
        roles: [],
      }),
    ).rejects.toThrow('Alias "vue" for "Nuxt" already names "Vue"')
  })
})
