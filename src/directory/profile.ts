// Signup form rules shared by the browser and the server. Imports no
// database code, so routes can use it client-side.
import type {
  CatalogSkill,
  CatalogTargetRole,
  JobSearchStatus,
  Seniority,
  StackLayer,
} from './directory'
import { normalizeName } from './normalize-name'

export const jobSearchStatusLabels: Record<JobSearchStatus, string> = {
  activelyLooking: 'Actively Looking',
  employedAndLooking: 'Employed and Looking',
  employedOpenToOffers: 'Employed and Open to Offers',
  notLooking: 'Not Looking',
}

export const seniorityLabels: Record<Seniority, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  staffPlus: 'Staff+',
}

export const stackLayerLabels: Record<StackLayer, string> = {
  frontendFramework: 'Frontend Framework',
  backendFramework: 'Backend Framework',
  backendLanguage: 'Backend Language',
  database: 'Database',
}

export type Catalogs = {
  skills: CatalogSkill[]
  roles: CatalogTargetRole[]
}

// What the Member typed. Names may be Aliases or differently cased or
// punctuated; they resolve against the Catalogs.
export type ProfileForm = {
  firstName: string
  lastName: string
  linkedinUrl: string
  jobSearchStatus: JobSearchStatus | null
  targetRoles: string[]
  preferredSeniority: Seniority | null
  // Seniorities the Member would also accept.
  otherSeniorities: Seniority[]
  preferredStack: Partial<Record<StackLayer, string>>
}

export type ProfileField = Exclude<keyof ProfileForm, 'otherSeniorities'>

// One message per field that blocks submission; empty when the form is ready.
export type ProfileProblems = Partial<Record<ProfileField, string>>

// The form with every name resolved to its canonical Catalog entry.
export type ResolvedProfile = {
  firstName: string
  lastName: string
  linkedinUrl: string
  jobSearchStatus: JobSearchStatus
  targetRoles: string[]
  preferredSeniority: Seniority
  otherSeniorities: Seniority[]
  preferredStack: Partial<Record<StackLayer, string>>
}

export type ProfileCheck =
  | { ok: true; profile: ResolvedProfile }
  | { ok: false; problems: ProfileProblems }

export function checkProfile(form: ProfileForm, catalogs: Catalogs): ProfileCheck {
  const problems: ProfileProblems = {}
  const firstName = form.firstName.trim()
  const lastName = form.lastName.trim()
  if (!firstName) problems.firstName = 'Enter your first name'
  if (!lastName) problems.lastName = 'Enter your last name'

  const linkedinUrl = toLinkedinUrl(form.linkedinUrl)
  if (!linkedinUrl) problems.linkedinUrl = 'Enter your LinkedIn profile URL'

  if (!form.jobSearchStatus) problems.jobSearchStatus = 'Choose a Job Search Status'
  if (!form.preferredSeniority) {
    problems.preferredSeniority = 'Choose your Preferred Seniority'
  }

  const targetRoles: string[] = []
  for (const typed of nonBlank(form.targetRoles)) {
    const role = findInCatalog(catalogs.roles, typed)
    if (!role) {
      problems.targetRoles ??= `Pick "${typed}" from the Role Catalog`
    } else if (!targetRoles.includes(role.name)) {
      targetRoles.push(role.name)
    }
  }
  if (targetRoles.length === 0) {
    problems.targetRoles ??= 'Choose at least one Target Role'
  }

  const preferredStack: Partial<Record<StackLayer, string>> = {}
  for (const [layer, typed] of Object.entries(form.preferredStack) as [
    StackLayer,
    string | undefined,
  ][]) {
    if (!typed?.trim()) continue
    const skill = findInCatalog(catalogs.skills, typed)
    if (!skill) {
      problems.preferredStack ??= `Pick "${typed.trim()}" from the Skill Catalog`
    } else if (skill.name === typeScript) {
      problems.preferredStack ??= 'TypeScript can never fill a Stack Layer'
    } else if (Object.values(preferredStack).includes(skill.name)) {
      problems.preferredStack ??= `${skill.name} can only fill one Stack Layer`
    } else {
      preferredStack[layer] = skill.name
    }
  }
  if (Object.keys(preferredStack).length === 0) {
    problems.preferredStack ??= 'Fill at least one Stack Layer'
  }

  if (
    Object.keys(problems).length > 0 ||
    !linkedinUrl ||
    !form.jobSearchStatus ||
    !form.preferredSeniority
  ) {
    return { ok: false, problems }
  }
  const { preferredSeniority } = form
  return {
    ok: true,
    profile: {
      firstName,
      lastName,
      linkedinUrl,
      jobSearchStatus: form.jobSearchStatus,
      targetRoles: targetRoles.sort(),
      preferredSeniority,
      otherSeniorities: sortSeniorities(
        form.otherSeniorities.filter((s) => s !== preferredSeniority),
      ),
      preferredStack,
    },
  }
}

export function profileProblems(
  form: ProfileForm,
  catalogs: Catalogs,
): ProfileProblems {
  const check = checkProfile(form, catalogs)
  return check.ok ? {} : check.problems
}

// The Catalog entry a typed name or Alias stands for, ignoring case, spaces,
// dots, hyphens, and underscores.
export function findInCatalog<Entry extends { name: string; aliases: string[] }>(
  entries: Entry[],
  typed: string,
): Entry | null {
  const key = normalizeName(typed)
  if (!key) return null
  return (
    entries.find(
      (entry) =>
        normalizeName(entry.name) === key ||
        entry.aliases.some((alias) => normalizeName(alias) === key),
    ) ?? null
  )
}

// Choices for one Stack Layer's dropdown: Skills suggested for that Layer
// first, then every other Skill, since the suggestion is only a hint
// (ADR 0002). TypeScript is left out because it never fills a Layer.
export function skillsForLayer(
  catalog: CatalogSkill[],
  layer: StackLayer,
): CatalogSkill[] {
  const choices = catalog.filter((skill) => skill.name !== typeScript)
  return [
    ...choices.filter((skill) => skill.suggestedLayer === layer),
    ...choices.filter((skill) => skill.suggestedLayer !== layer),
  ]
}

export function sortSeniorities(seniorities: Seniority[]): Seniority[] {
  const order = Object.keys(seniorityLabels) as Seniority[]
  return order.filter((seniority) => seniorities.includes(seniority))
}

const typeScript = 'TypeScript'

// Accepts a URL on linkedin.com, with or without "https://".
function toLinkedinUrl(typed: string): string | null {
  const trimmed = typed.trim()
  if (!trimmed) return null
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null
  return url.toString()
}

function nonBlank(names: string[]): string[] {
  return names.map((name) => name.trim()).filter(Boolean)
}

// Checks the shape of a form sent to the server, where it can't be trusted.
// Throws on anything that isn't a ProfileForm; `checkProfile` then decides
// whether it's complete.
export function parseProfileForm(input: unknown): ProfileForm {
  const fail = (field: string): never => {
    throw new Error(`Malformed signup form: ${field}`)
  }
  if (typeof input !== 'object' || input === null) fail('not an object')
  const form = input as Record<string, unknown>
  const text = (field: string) =>
    typeof form[field] === 'string' ? form[field] : fail(field)
  const oneOf = <T extends string>(field: string, value: unknown, labels: Record<T, string>) =>
    typeof value === 'string' && Object.hasOwn(labels, value) ? (value as T) : fail(field)
  const list = (field: string) =>
    Array.isArray(form[field]) ? (form[field] as unknown[]) : fail(field)

  const stack = form.preferredStack
  if (typeof stack !== 'object' || stack === null) fail('preferredStack')
  const preferredStack: ProfileForm['preferredStack'] = {}
  for (const [layer, name] of Object.entries(stack as object)) {
    if (name === undefined) continue
    if (typeof name !== 'string') fail('preferredStack')
    preferredStack[oneOf('preferredStack', layer, stackLayerLabels)] = name
  }
  return {
    firstName: text('firstName'),
    lastName: text('lastName'),
    linkedinUrl: text('linkedinUrl'),
    jobSearchStatus:
      form.jobSearchStatus === null
        ? null
        : oneOf('jobSearchStatus', form.jobSearchStatus, jobSearchStatusLabels),
    targetRoles: list('targetRoles').map((name) =>
      typeof name === 'string' ? name : fail('targetRoles'),
    ),
    preferredSeniority:
      form.preferredSeniority === null
        ? null
        : oneOf('preferredSeniority', form.preferredSeniority, seniorityLabels),
    otherSeniorities: list('otherSeniorities').map((value) =>
      oneOf('otherSeniorities', value, seniorityLabels),
    ),
    preferredStack,
  }
}
