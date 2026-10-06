import type { DiscordConnection } from './directory'

// The fields of Discord's /users/@me response that the Directory uses.
export type DiscordProfile = {
  id: string
  username: string
  // "0" for accounts that moved to Discord's unique usernames.
  discriminator: string
  // Null until the user uploads a picture; `a_` hashes are animated.
  avatar: string | null
}

// What other Members type to find someone on Discord.
export function discordHandle({
  username,
  discriminator,
}: Pick<DiscordProfile, 'username' | 'discriminator'>): string {
  return discriminator === '0' ? username : `${username}#${discriminator}`
}

// The Member's Discord profile picture. Without a custom one, Discord shows
// one of six default pictures picked from the user ID.
export function discordAvatarUrl({
  userId,
  avatar,
}: Pick<DiscordConnection, 'userId' | 'avatar'>): string {
  if (avatar) {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=128`
  }
  const index = (BigInt(userId) >> 22n) % 6n
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`
}
