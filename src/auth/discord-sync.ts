import { directory } from '../directory/app-directory'
import { discordHandle, type DiscordProfile } from '../directory/discord-handle'
import { discordGet, type LinkedDiscordAccount } from './discord-api'

export type DiscordSyncResult = 'synced' | 'failed'

// Copies the linked Discord account's user ID and current handle onto the
// Member. Never throws: a Discord outage must not block the page, and the
// next page load tries again because the sync time stays old.
export async function syncDiscord(
  linked: LinkedDiscordAccount,
): Promise<DiscordSyncResult> {
  try {
    const profile = await discordGet<DiscordProfile>(linked, '/users/@me')
    await directory.connectDiscord({
      authUserId: linked.userId,
      discord: { userId: profile.id, handle: discordHandle(profile) },
    })
    return 'synced'
  } catch (error) {
    console.error('Could not sync the Discord connection', error)
    return 'failed'
  }
}
