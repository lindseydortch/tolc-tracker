import { createNeonDb } from './neon'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Add it to .env.local.')
}

// The app's single database connection. Server-only.
export const db = createNeonDb(databaseUrl)
