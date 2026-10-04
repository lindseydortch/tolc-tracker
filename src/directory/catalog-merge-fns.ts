import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireLandingPage } from '../auth/session'
import { directory } from './app-directory'
import { parseMergeForm } from './merge-form'

// Anyone but the Admin gets the not-found page, as if merging didn't exist.
// The Directory checks again before merging; this check is what turns a
// non-Admin into a not-found page instead of an error.
async function requireAdmin(): Promise<string> {
  const authUserId = await requireLandingPage('/')
  if (!(await directory.isAdmin(authUserId))) throw notFound()
  return authUserId
}

export const getMergeCatalogs = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAdmin()
    return directory.catalogs()
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
