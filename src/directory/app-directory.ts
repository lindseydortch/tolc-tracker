import { discordMembershipChecker } from '../auth/discord-membership'
import { db } from '../db/db'
import { createDirectory } from './directory'

// The Directory the running app uses. Server-only.
export const directory = createDirectory(db, {
  membershipChecker: discordMembershipChecker,
  adminDiscordUserId: process.env.ADMIN_DISCORD_USER_ID,
})
