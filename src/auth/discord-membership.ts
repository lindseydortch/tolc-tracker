import type { MembershipChecker } from '../directory/membership-checker'
import { discordGet, findLinkedDiscordAccount } from './discord-api'

const tolcGuildId = process.env.TOLC_DISCORD_GUILD_ID
if (!tolcGuildId) {
  throw new Error('TOLC_DISCORD_GUILD_ID is not set. Add it to .env.local.')
}

// Asks Discord, with the Member's own token and its `guilds` scope, whether
// they are in the TOLC server.
export const discordMembershipChecker: MembershipChecker = {
  async isInTolc({ authUserId, discordUserId }) {
    const linked = await findLinkedDiscordAccount(authUserId)
    if (linked?.accountId !== discordUserId) {
      throw new Error(`Discord account "${discordUserId}" is no longer linked`)
    }
    // 200 is both the page cap and Discord's cap on servers a user can
    // join, so one page holds them all.
    const guilds = await discordGet<{ id: string }[]>(
      linked,
      '/users/@me/guilds?limit=200',
    )
    return guilds.some((guild) => guild.id === tolcGuildId)
  },
}
