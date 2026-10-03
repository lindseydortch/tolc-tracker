import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '../db/schema'
import { createDirectory } from './directory'

// A Directory backed by a fresh in-memory Postgres with production migrations.
export async function createTestDirectory() {
  const db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder: 'drizzle' })
  return createDirectory(db)
}
