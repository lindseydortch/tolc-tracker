import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'
import type { Db } from './client'

// The websocket driver, because the Directory module relies on transactions.
export function createNeonDb(databaseUrl: string): Db {
  const pool = new Pool({ connectionString: databaseUrl })
  // Neon drops idle connections (after its idle timeout, or when the laptop
  // sleeps). The pool then emits 'error' for that idle client, and without a
  // listener Node treats it as unhandled and exits. The pool already throws
  // the dead client away and opens a fresh one on the next query.
  pool.on('error', (error: Error) => {
    console.error('An idle database connection was closed', error.message)
  })
  return drizzle(pool, { schema })
}
