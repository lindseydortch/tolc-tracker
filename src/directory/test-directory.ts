import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '../db/schema'
import { createDirectory } from './directory'
import {
  DiscordUnavailableError,
  type MembershipChecker,
} from './membership-checker'

// The Discord user ID test Directories treat as the Admin's.
export const testAdminDiscordUserId = '1000000000000000001'

// A Directory backed by a fresh in-memory Postgres with production migrations.
export async function createTestDirectory() {
  return (await createTestSetup()).directory
}

// Also exposes `db`, for setting up states the Directory itself never
// creates, `tolc`, a fake TOLC server the Directory's membership checks
// ask, and `signUpWithGitHub`, standing in for Better Auth creating its
// user row on a first GitHub sign-in. Returns that row's id (`authUserId`).
// Pass `adminDiscordUserId: null` for a Directory with no Admin configured.
export async function createTestSetup({
  adminDiscordUserId = testAdminDiscordUserId,
}: { adminDiscordUserId?: string | null } = {}) {
  const db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder: 'drizzle' })
  let userCount = 0
  const tolc = createFakeTolc()
  return {
    db,
    directory: createDirectory(db, {
      membershipChecker: tolc,
      adminDiscordUserId,
    }),
    tolc,
    async signUpWithGitHub(githubUsername: string): Promise<string> {
      const id = `user-${++userCount}`
      await db.insert(schema.user).values({
        id,
        name: githubUsername,
        email: `${githubUsername}@example.com`,
        githubUsername,
      })
      return id
    },
  }
}

function createFakeTolc() {
  const discordUserIds = new Set<string>()
  let failure: 'down' | 'refusing' | null = null
  let checks = 0
  const checker: MembershipChecker = {
    async isInTolc({ discordUserId }) {
      checks++
      if (failure === 'down') throw new DiscordUnavailableError('Discord is down')
      if (failure === 'refusing') throw new Error('Discord returned 401')
      return discordUserIds.has(discordUserId)
    },
  }
  return {
    ...checker,
    join(discordUserId: string) {
      discordUserIds.add(discordUserId)
    },
    leave(discordUserId: string) {
      discordUserIds.delete(discordUserId)
    },
    goDown() {
      failure = 'down'
    },
    // Like a revoked Discord link: Discord is up but won't answer.
    refuse() {
      failure = 'refusing'
    },
    // Undoes `goDown` or `refuse`.
    comeBack() {
      failure = null
    },
    // How many times the Directory asked, including failed attempts.
    get checks() {
      return checks
    },
  }
}
