import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'
import type { Db } from './client'

// The websocket driver, because the Directory module relies on transactions.
export function createNeonDb(databaseUrl: string): Db {
  return drizzle(new Pool({ connectionString: databaseUrl }), { schema })
}
