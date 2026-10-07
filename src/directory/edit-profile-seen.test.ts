import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { describe, expect, it } from 'vitest'
import { createTestSetup, migrationsBefore } from './test-directory'
import { memberWithProfile, octoForm, seededSetup } from './test-profiles'

describe('the Edit Profile prompt', () => {
  it("is on for a new Member until they open Edit Profile", async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')

    expect(await setup.directory.hasSeenEditProfile(authUserId)).toBe(false)

    await setup.directory.markEditProfileSeen(authUserId)
    expect(await setup.directory.hasSeenEditProfile(authUserId)).toBe(true)
  })

  it('stays off once seen', async () => {
    const setup = await seededSetup()
    const { authUserId } = await memberWithProfile(setup, 'octocat')
    await setup.directory.markEditProfileSeen(authUserId)
    await setup.directory.markEditProfileSeen(authUserId)

    expect(await setup.directory.hasSeenEditProfile(authUserId)).toBe(true)
  })

  it("only marks the signed-in Member's own profile", async () => {
    const setup = await seededSetup()
    const { authUserId: octo } = await memberWithProfile(setup, 'octocat')
    const { authUserId: hubot } = await memberWithProfile(setup, 'hubot')

    await setup.directory.markEditProfileSeen(octo)

    expect(await setup.directory.hasSeenEditProfile(hubot)).toBe(false)
  })
})

describe('the migration adding the Edit Profile prompt', () => {
  it('counts Members who already signed up as having seen Edit Profile', async () => {
    const { db, directory, signUpWithGitHub } = await createTestSetup({
      migrationsFolder: migrationsBefore('edit_profile_seen_at'),
    })
    const signedUp = await signUpWithGitHub('octocat')
    const midSignup = await signUpWithGitHub('hubot')
    // Raw SQL: the schema already has the column this migration adds.
    await db.execute(sql`
      insert into members (auth_user_id, first_name)
      values (${signedUp}, ${octoForm.firstName}), (${midSignup}, null)
    `)

    await migrate(db, { migrationsFolder: 'drizzle' })

    expect(await directory.hasSeenEditProfile(signedUp)).toBe(true)
    expect(await directory.hasSeenEditProfile(midSignup)).toBe(false)
  })
})
