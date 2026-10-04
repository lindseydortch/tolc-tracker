import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireLandingPage } from '../auth/session'
import { directory } from './app-directory'
import { parseMergeForm } from './merge-form'

// Anyone but the Admin gets the not-found page, as if the Admin page didn't
// exist. The Directory checks again before acting; this check is what turns
// a non-Admin into a not-found page instead of an error.
async function requireAdmin(): Promise<string> {
  const authUserId = await requireLandingPage('/')
  if (!(await directory.isAdmin(authUserId))) throw notFound()
  return authUserId
}

function parseMemberId(input: unknown): number {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 1) {
    throw new Error('Malformed Member id')
  }
  return input
}

export const getAdminPage = createServerFn({ method: 'GET' }).handler(
  async () => {
    const authUserId = await requireAdmin()
    return {
      managed: await directory.managedMembers(authUserId),
      catalogs: await directory.catalogs(),
    }
  },
)

export const mergeSkills = createServerFn({ method: 'POST' })
  .validator(parseMergeForm)
  .handler(async ({ data }) => {
    const authUserId = await requireAdmin()
    return directory.mergeSkills({ authUserId, ...data })
  })

export const mergeTargetRoles = createServerFn({ method: 'POST' })
  .validator(parseMergeForm)
  .handler(async ({ data }) => {
    const authUserId = await requireAdmin()
    return directory.mergeTargetRoles({ authUserId, ...data })
  })

export const hideMember = createServerFn({ method: 'POST' })
  .validator(parseMemberId)
  .handler(async ({ data }) => {
    const authUserId = await requireAdmin()
    return directory.hideMember({ authUserId, memberId: data })
  })

export const reactivateMember = createServerFn({ method: 'POST' })
  .validator(parseMemberId)
  .handler(async ({ data }) => {
    const authUserId = await requireAdmin()
    return directory.reactivateMember({ authUserId, memberId: data })
  })

export const deleteMember = createServerFn({ method: 'POST' })
  .validator(parseMemberId)
  .handler(async ({ data }) => {
    const authUserId = await requireAdmin()
    return directory.deleteMember({ authUserId, memberId: data })
  })
