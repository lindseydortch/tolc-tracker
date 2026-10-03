import { and, eq } from 'drizzle-orm'
import { db } from '../db/db'
import { account } from '../db/schema'
import { directory } from '../directory/app-directory'
import { discordHandle, type DiscordProfile } from '../directory/discord-handle'
import { auth } from './auth'

// Copies the linked Discord account's user ID and current handle onto the
// Member. Returns false if that failed, true otherwise (including for a
// Member without Discord). Never throws: a Discord outage must not block
// sign-in, and the next sign-in or page load tries again.
export async function syncDiscord(authUserId: string): Promise<boolean> {
  try {
    const [discordAccount] = await db
      .select({ id: account.id })
      .from(account)
      .where(
        and(eq(account.userId, authUserId), eq(account.providerId, 'discord')),
      )
    if (!discordAccount) return true
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
    return true
  } catch (error) {
    console.error('Could not sync the Discord connection', error)
    return false
  }
}
