import { directory } from '../directory/app-directory'
import { discordHandle, type DiscordProfile } from '../directory/discord-handle'
import { auth } from './auth'
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
    // Refreshes the access token first if it has expired.
    const { accessToken } = await auth.api.getAccessToken({
      body: { accountId: discordAccount.id, userId: authUserId },
    })
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) {
      throw new Error(`Discord /users/@me returned ${response.status}`)
    }
    const profile = (await response.json()) as DiscordProfile
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
