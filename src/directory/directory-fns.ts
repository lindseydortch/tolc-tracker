import { createServerFn } from '@tanstack/react-start'
import { requireLandingPage } from '../auth/session'
import { directory } from './app-directory'
import { parseProfileForm } from './profile'

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

export const getDirectory = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireLandingPage('/')
    return directory.directoryEntries()
  },
)

export const getMemberProfile = createServerFn({ method: 'GET' })
  .validator((memberId: unknown) => {
    if (!Number.isSafeInteger(memberId)) throw new Error('Malformed Member id')
    return memberId as number
  })
  .handler(async ({ data: memberId }) => {
    await requireLandingPage('/')
    return directory.memberProfile(memberId)
  })
