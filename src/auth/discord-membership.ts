import { and, eq } from 'drizzle-orm'
import { db } from '../db/db'
import { account } from '../db/schema'
import type { MembershipChecker } from '../directory/directory'
import { discordGet } from './discord-api'
import { discordProviderId } from './discord-provider'

const tolcGuildId = process.env.TOLC_DISCORD_GUILD_ID
if (!tolcGuildId) {
  throw new Error('TOLC_DISCORD_GUILD_ID is not set. Add it to .env.local.')
}

// Asks Discord, with the Member's own token and its `guilds` scope, whether
// they are in the TOLC server.
export const discordMembershipChecker: MembershipChecker = {
  async isInTolc(discordUserId) {
    // Better Auth keeps the Discord user ID in the account's `accountId`.
    const [linked] = await db
      .select({ id: account.id, userId: account.userId })
      .from(account)
      .where(
        and(
          eq(account.providerId, discordProviderId),
          eq(account.accountId, discordUserId),
        ),
      )
    if (!linked) throw new Error(`No linked Discord account "${discordUserId}"`)
    // 200 is both the page cap and Discord's cap on servers a user can
    // join, so one page holds them all.
    const guilds = await discordGet<{ id: string }[]>(
      linked,
      '/users/@me/guilds?limit=200',
    )
    return guilds.some((guild) => guild.id === tolcGuildId)
  },
}
