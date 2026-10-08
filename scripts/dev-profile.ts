import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { createNeonDb } from '../src/db/neon'
import { memberSkills, members } from '../src/db/schema'
import { createDirectory } from '../src/directory/directory'
import { emptyPlace } from '../src/directory/location'
import { emptyLinks } from '../src/directory/profile-links'

// Resets the Admin's Member in the dev database to a standing, clearly fake
// profile, so live tests start from the same filled profile every time.
// Dev only: refuses to run with NODE_ENV=production. Prints nothing from
// the Member's row.

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL
const adminDiscordUserId = process.env.ADMIN_DISCORD_USER_ID
if (process.env.NODE_ENV === 'production') {
  throw new Error('dev-profile only runs against the dev database.')
}
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Add it to .env.local.')
}
if (!adminDiscordUserId) {
  throw new Error('ADMIN_DISCORD_USER_ID is not set. Add it to .env.local.')
}

const db = createNeonDb(databaseUrl)
const directory = createDirectory(db, { adminDiscordUserId })

const [admin] = await db
  .select({ id: members.id, authUserId: members.authUserId })
  .from(members)
  .where(eq(members.discordUserId, adminDiscordUserId))
if (!admin) {
  throw new Error(
    "No Member has the Admin's Discord account yet. Sign in and connect Discord first.",
  )
}
const { authUserId } = admin

// Start the Tech Stack from empty, because the signup form keeps Skills
// dropped from the Preferred Stack as Secondary Skills.
await db.delete(memberSkills).where(eq(memberSkills.memberId, admin.id))

const steps = [
  await directory.completeProfile({
    authUserId,
    form: {
      firstName: 'Test',
      lastName: 'Admin',
      linkedinUrl: 'https://www.linkedin.com/in/test-admin',
      jobSearchStatus: 'employedOpenToOffers',
      targetRoles: ['Software Engineer', 'Product Engineer'],
      preferredSeniority: 'senior',
      otherSeniorities: ['mid', 'staffPlus'],
      workArrangements: ['remote', 'hybrid'],
      location: {
        city: 'Testville',
        region: 'TX',
        country: 'United States',
        timeZone: 'America/Chicago',
      },
      wantsToWorkFrom: [{ ...emptyPlace, country: 'Italy' }],
      willingToRelocate: true,
      preferredStack: {
        frontendFramework: 'React',
        backendFramework: 'Express',
        backendLanguage: 'Node.js',
        database: 'PostgreSQL',
      },
    },
  }),
  await directory.addSkill({ authUserId, skill: 'Docker' }),
  await directory.addSkill({ authUserId, skill: 'GraphQL' }),
  await directory.saveLinks({
    authUserId,
    links: {
      ...emptyLinks(),
      resume: 'https://example.com/test-admin-resume.pdf',
      portfolio: 'https://example.com/test-admin',
      custom: [{ label: 'Test talk', url: 'https://example.com/test-talk' }],
    },
  }),
]
const failed = steps.find((result) => !result.ok)
if (failed) {
  console.error('Could not reset the dev profile:', JSON.stringify(failed))
  process.exit(1)
}
await directory.setTypeScriptBadge({ authUserId, on: true })

console.log('Dev profile reset to the standing "Test Admin" profile.')
process.exit(0)
