import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
// Pass `adminDiscordUserId: null` for a Directory with no Admin configured,
// and `migrationsFolder` (see `migrationsBefore`) to start from an older schema.
export async function createTestSetup({
  adminDiscordUserId = testAdminDiscordUserId,
  migrationsFolder = 'drizzle',
}: { adminDiscordUserId?: string | null; migrationsFolder?: string } = {}) {
  const db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder })
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

// A copy of the migrations folder without the first migration whose SQL
// mentions `marker`, or any after it, so a test can set up rows from
// before it ran. Migrating to 'drizzle' afterwards applies the rest.
export function migrationsBefore(marker: string): string {
  const folder = mkdtempSync(join(tmpdir(), 'tolc-migrations-'))
  cpSync('drizzle', folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'))
  const cut = journal.entries.findIndex((entry: { tag: string }) =>
    readFileSync(join(folder, `${entry.tag}.sql`), 'utf8').includes(marker),
  )
  if (cut < 0) throw new Error(`No migration mentions "${marker}"`)
  journal.entries = journal.entries.slice(0, cut)
  writeFileSync(journalPath, JSON.stringify(journal))
  return folder
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
