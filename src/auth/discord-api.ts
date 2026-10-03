import { DiscordUnavailableError } from '../directory/directory'
import { auth } from './auth'

// A Member's linked Discord account: Better Auth's account row id and the
// auth user it belongs to.
export type LinkedDiscordAccount = { id: string; userId: string }

// GETs a Discord API path (such as '/users/@me') as the Member, refreshing
// their access token first if it has expired. Throws
// `DiscordUnavailableError` when Discord is down or rate-limiting, and a
// plain error when it refuses (such as a revoked link).
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
