import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '../db/schema'
import { createDirectory } from './directory'

// A Directory backed by a fresh in-memory Postgres with production migrations.
export async function createTestDirectory() {
  return (await createTestSetup()).directory
}

// Also exposes `signUpWithGitHub`, standing in for Better Auth creating its
// user row on a first GitHub sign-in. Returns that row's id (`authUserId`).
export async function createTestSetup() {
  const db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder: 'drizzle' })
  let userCount = 0
  return {
    directory: createDirectory(db),
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
