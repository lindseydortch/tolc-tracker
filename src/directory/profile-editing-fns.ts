import { createServerFn } from '@tanstack/react-start'
import { requireLandingPage } from '../auth/session'
import { directory } from './app-directory'
import {
  parseAddSkillForm,
  parseDetailsForm,
  parseLinksForm,
  parseSkillName,
  parseTypeScriptBadge,
} from './profile'

// Every edit is made to the signed-in Member's own profile: none of these
// take a Member from the browser.

export const getProfileEditor = createServerFn({ method: 'GET' }).handler(
  async () => {
    const authUserId = await requireLandingPage('/')
    return {
      profile: await directory.profileForEditing(authUserId),
      catalogs: await directory.catalogs(),
    }
  },
)

export const updateDetails = createServerFn({ method: 'POST' })
  .validator(parseDetailsForm)
  .handler(async ({ data }) => {
    const authUserId = await requireLandingPage('/')
    return directory.updateDetails({ authUserId, form: data })
  })

export const addSkill = createServerFn({ method: 'POST' })
  .validator(parseAddSkillForm)
  .handler(async ({ data }) => {
    const authUserId = await requireLandingPage('/')
    return directory.addSkill({ authUserId, ...data })
  })

export const removeSkill = createServerFn({ method: 'POST' })
  .validator(parseSkillName)
  .handler(async ({ data }) => {
    const authUserId = await requireLandingPage('/')
    return directory.removeSkill({ authUserId, ...data })
  })

export const setTypeScriptBadge = createServerFn({ method: 'POST' })
  .validator(parseTypeScriptBadge)
  .handler(async ({ data }) => {
    const authUserId = await requireLandingPage('/')
    await directory.setTypeScriptBadge({ authUserId, ...data })
  })

export const saveLinks = createServerFn({ method: 'POST' })
  .validator(parseLinksForm)
  .handler(async ({ data }) => {
    const authUserId = await requireLandingPage('/')
    return directory.saveLinks({ authUserId, links: data })
  })
