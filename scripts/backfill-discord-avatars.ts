import { config } from 'dotenv'

// Syncs every Member's Discord once with their own linked account, so
// Members who connected Discord before avatars were stored get their
// current picture now instead of on their next sign-in. Safe to run again.
// Reads .env.local; variables already set in the shell win, so it can run
// against production with production's env. Prints counts only.

config({ path: '.env.local' })

// After the env is loaded: these read it on import.
const { isNotNull } = await import('drizzle-orm')
const { db } = await import('../src/db/db')
const { members } = await import('../src/db/schema')
const { findLinkedDiscordAccount } = await import('../src/auth/discord-api')
const { syncDiscord } = await import('../src/auth/discord-sync')

const connected = await db
  .select({ authUserId: members.authUserId })
  .from(members)
  .where(isNotNull(members.discordUserId))

let synced = 0
let failed = 0
for (const { authUserId } of connected) {
  const linked = await findLinkedDiscordAccount(authUserId)
  if (linked && (await syncDiscord(linked)) === 'synced') synced++
  else failed++
}
console.log(`Synced ${synced} of ${connected.length} Members; ${failed} failed.`)
