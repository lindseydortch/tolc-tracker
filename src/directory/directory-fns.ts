import { createServerFn } from '@tanstack/react-start'
import { findLinkedDiscordAccount } from '../auth/discord-api'
import { syncDiscord } from '../auth/discord-sync'
import { requireLandingPage } from '../auth/session'
import { directory } from './app-directory'
import { parseProfileForm } from './profile-parsing'
import { parseDirectorySearch } from './search'

// The Catalogs the signup form autocompletes from.
export const getSignupCatalogs = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireLandingPage('/signup')
    return directory.catalogs()
  },
)

export const submitProfile = createServerFn({ method: 'POST' })
  .validator(parseProfileForm)
  .handler(async ({ data }) => {
    const authUserId = await requireLandingPage('/signup')
    return directory.completeProfile({ authUserId, form: data })
  })

// The Quick View's cards, narrowed and ranked by `search`, plus the
// Catalogs its search form autocompletes from.
export const getDirectory = createServerFn({ method: 'GET' })
  .validator(parseDirectorySearch)
  .handler(async ({ data }) => {
    await requireLandingPage('/')
    return {
      entries: await directory.searchDirectory(data),
      catalogs: await directory.catalogs(),
    }
  })

// Takes the id straight from the URL. Null when it names no Member in the
// Directory, including when it isn't a number at all.
export const getMemberProfile = createServerFn({ method: 'GET' })
  .validator((memberId: unknown) => {
    if (typeof memberId !== 'string') throw new Error('Malformed Member id')
    return memberId
  })
  .handler(async ({ data }) => {
    await requireLandingPage('/')
    const memberId = /^\d+$/.test(data) ? Number(data) : NaN
    if (!Number.isSafeInteger(memberId)) return null
    return directory.memberProfile(memberId)
  })

// Called when a badge photo stops loading. Syncs that Member's Discord with
// their own linked account, so a changed avatar shows without them signing
// in again. Returns the photo's URL now, or null if there's nothing newer.
export const refreshDiscordAvatar = createServerFn({ method: 'POST' })
  .validator((memberId: unknown) => {
    if (typeof memberId !== 'number' || !Number.isSafeInteger(memberId)) {
      throw new Error('Malformed Member id')
    }
    return memberId
  })
  .handler(async ({ data: memberId }) => {
    await requireLandingPage('/')
    const authUserId = await directory.claimAvatarRefresh(memberId)
    if (!authUserId) return null
    const linked = await findLinkedDiscordAccount(authUserId)
    if (!linked || (await syncDiscord(linked)) === 'failed') return null
    return (await directory.memberProfile(memberId))?.discordAvatarUrl ?? null
  })
