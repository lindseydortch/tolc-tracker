import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import type * as schema from './schema'

// Shared by the Neon client in the app and the PGlite client in tests.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>
