// The fields of Discord's /users/@me response that the Directory uses.
export type DiscordProfile = {
  id: string
  username: string
  // "0" for accounts that moved to Discord's unique usernames.
  discriminator: string
}

// What other Members type to find someone on Discord.
export function discordHandle({
  username,
  discriminator,
}: Pick<DiscordProfile, 'username' | 'discriminator'>): string {
  return discriminator === '0' ? username : `${username}#${discriminator}`
}
