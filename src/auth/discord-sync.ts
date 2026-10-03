import { directory } from '../directory/app-directory'
import { discordHandle, type DiscordProfile } from '../directory/discord-handle'
import { auth } from './auth'
import { discordGet } from './discord-api'
import { discordProviderId } from './discord-provider'

export type DiscordSyncResult = 'synced' | 'not-linked' | 'failed'

// Copies the linked Discord account's user ID and current handle onto the
// Member. Never throws: a Discord outage must not block the page, and the
// next page load tries again because the sync time stays old.
export async function syncDiscord(
  authUserId: string,
): Promise<DiscordSyncResult> {
  try {
    const { internalAdapter } = await auth.$context
    const linkedAccounts = await internalAdapter.findAccounts(authUserId)
    const discordAccount = linkedAccounts.find(
      (linked) => linked.providerId === discordProviderId,
    )
    if (!discordAccount) return 'not-linked'
    const profile = await discordGet<DiscordProfile>(
      { id: discordAccount.id, userId: authUserId },
      '/users/@me',
    )
    await directory.connectDiscord({
      authUserId,
      discord: { userId: profile.id, handle: discordHandle(profile) },
    })
    return 'synced'
  } catch (error) {
    console.error('Could not sync the Discord connection', error)
    return 'failed'
  }
}
