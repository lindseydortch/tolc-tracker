import { isNotNull } from 'drizzle-orm'
import { syncDiscordFor } from '../src/auth/discord-sync'
import { db } from '../src/db/db'
import { members } from '../src/db/schema'

// Syncs every Member's Discord once with their own linked account, so
// Members who connected Discord before avatars were stored get their
// current picture now instead of on their next visit. Safe to run again.
// `pnpm db:backfill-avatars` loads .env.local; variables already set in the
// shell win, so it runs against production with production's env. Prints
// counts only.

const connected = await db
  .select({ authUserId: members.authUserId })
  .from(members)
  .where(isNotNull(members.discordUserId))

let synced = 0
for (const { authUserId } of connected) {
  if ((await syncDiscordFor(authUserId)) === 'synced') synced++
}
console.log(
  `Synced ${synced} of ${connected.length} Members; ${connected.length - synced} failed.`,
)
process.exit(0)
