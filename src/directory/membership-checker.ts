// The Directory's contract with whatever asks Discord about TOLC membership.
// Lives apart from the real checker so the Directory and its tests never
// load the app's auth or database.

// Answers whether a Member's Discord account is in TOLC. Throws
// `DiscordUnavailableError` when Discord is down or rate-limiting, and any
// other error when Discord refuses to answer (such as a revoked link).
export type MembershipChecker = {
  isInTolc(member: { authUserId: string; discordUserId: string }): Promise<boolean>
}

// Discord couldn't answer right now but may soon: the last answer stands.
export class DiscordUnavailableError extends Error {}
