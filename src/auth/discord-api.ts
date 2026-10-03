import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db/db'
import { account } from '../db/schema'
import { DiscordUnavailableError } from '../directory/membership-checker'
import { auth } from './auth'
import { discordProviderId } from './discord-provider'

// A Member's linked Discord account, as Better Auth stores it.
export type LinkedDiscordAccount = {
  // Better Auth's account row id.
  id: string
  // The auth user it belongs to.
  userId: string
  // The Discord user ID.
  accountId: string
  // Moves on every connect and token refresh.
  updatedAt: Date
}

// The Discord account the Member connected or reconnected most recently, or
// null. Linking a different Discord account adds a row rather than
// replacing the old one.
export async function findLinkedDiscordAccount(
  authUserId: string,
): Promise<LinkedDiscordAccount | null> {
  const [linked] = await db
    .select({
      id: account.id,
      userId: account.userId,
      accountId: account.accountId,
      updatedAt: account.updatedAt,
    })
    .from(account)
    .where(
      and(eq(account.userId, authUserId), eq(account.providerId, discordProviderId)),
    )
    .orderBy(desc(account.updatedAt))
    .limit(1)
  return linked ?? null
}

// GETs a Discord API path (such as '/users/@me') as the Member, refreshing
// their access token first if it has expired. Throws
// `DiscordUnavailableError` when Discord is down or rate-limiting, and a
// plain error when it refuses (such as a revoked link). A failed token
// refresh counts as a refusal: Better Auth reports a revoked link and a
// Discord outage alike, and failing closed heals on the next good answer.
export async function discordGet<T>(
  linked: LinkedDiscordAccount,
  path: string,
): Promise<T> {
  const { accessToken } = await auth.api.getAccessToken({
    body: { accountId: linked.id, userId: linked.userId },
  })
  let response: Response
  try {
    response = await fetch(`https://discord.com/api/v10${path}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
  } catch (error) {
    throw new DiscordUnavailableError(`Could not reach Discord ${path}`, {
      cause: error,
    })
  }
  if (response.status === 429 || response.status >= 500) {
    throw new DiscordUnavailableError(`Discord ${path} returned ${response.status}`)
  }
  if (!response.ok) {
    throw new Error(`Discord ${path} returned ${response.status}`)
  }
  return (await response.json()) as T
}
