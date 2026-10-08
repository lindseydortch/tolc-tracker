// Signup form rules shared by the browser and the server. Imports no
// database code, so routes can use it client-side.
import type {
  CatalogSkill,
  CatalogTargetRole,
  JobSearchStatus,
  Seniority,
  StackLayer,
} from './directory'
import { inOrder } from './in-order'
import {
  checkWhereToWork,
  emptyLocation,
  hasWhereToWork,
  type WhereToWork,
  type WhereToWorkField,
} from './location'
import { normalizeName, tidyName } from './normalize-name'
import { optionalLinks, type LinksForm } from './profile-links'
import { toUrl } from './to-url'

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

export const seniorities = Object.keys(seniorityLabels) as Seniority[]
export const stackLayers = Object.keys(stackLayerLabels) as StackLayer[]

export type PreferredStack = Partial<Record<StackLayer, string>>

// The editable profile fields other than the Tech Stack. Names may be
// Aliases or differently cased or punctuated; they resolve against the
// Catalogs, and names not in them become new entries. `location.ts` checks
// the `WhereToWork` fields.
export type DetailsForm = WhereToWork & {
  firstName: string
  lastName: string
  linkedinUrl: string
  jobSearchStatus: JobSearchStatus | null
  targetRoles: string[]
  preferredSeniority: Seniority | null
  // Seniorities the Member would also accept.
  otherSeniorities: Seniority[]
}

// The signup form: the details plus a first Preferred Stack.
export type ProfileForm = DetailsForm & { preferredStack: PreferredStack }

export const emptyForm: ProfileForm = {
  firstName: '',
  lastName: '',
  linkedinUrl: '',
  jobSearchStatus: null,
  targetRoles: [''],
  preferredSeniority: null,
  otherSeniorities: [],
  workArrangements: [],
  location: emptyLocation,
  wantsToWorkFrom: [],
  willingToRelocate: false,
  preferredStack: {},
}

export type ProfileField =
  | Exclude<keyof ProfileForm, 'otherSeniorities' | keyof WhereToWork>
  | WhereToWorkField

// One message per field that blocks submission; empty when the form is ready.
export type ProfileProblems = Partial<Record<ProfileField, string>>

// The details with every name resolved to its canonical Catalog entry, or
// tidied up as the name of a new one.
export type ResolvedDetails = {
  [Field in keyof DetailsForm]-?: Exclude<DetailsForm[Field], null>
}

export type ResolvedProfile = ResolvedDetails & { preferredStack: PreferredStack }

export type DetailsCheck =
  | { ok: true; details: ResolvedDetails }
  | { ok: false; problems: ProfileProblems }

export type ProfileCheck =
  | { ok: true; profile: ResolvedProfile }
  | { ok: false; problems: ProfileProblems }

export function checkDetails(form: DetailsForm, catalogs: Catalogs): DetailsCheck {
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
    const name = catalogName(catalogs.roles, typed)
    if (!targetRoles.some((role) => sameName(role, name))) {
      targetRoles.push(name)
    }
  }
  if (targetRoles.length === 0) {
    problems.targetRoles = 'Choose at least one Target Role'
  }

  const whereToWork = checkWhereToWork(form)
  Object.assign(problems, whereToWork.problems)

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
    details: {
      firstName,
      lastName,
      linkedinUrl,
      jobSearchStatus: form.jobSearchStatus,
      targetRoles: targetRoles.sort(),
      preferredSeniority,
      otherSeniorities: sortSeniorities(
        form.otherSeniorities.filter((s) => s !== preferredSeniority),
      ),
      ...whereToWork.tidied,
    },
  }
}

export function checkProfile(form: ProfileForm, catalogs: Catalogs): ProfileCheck {
  const details = checkDetails(form, catalogs)
  const problems: ProfileProblems = details.ok ? {} : { ...details.problems }

  const preferredStack: PreferredStack = {}
  for (const [layer, typed] of Object.entries(form.preferredStack) as [
    StackLayer,
    string | undefined,
  ][]) {
    if (!typed || !normalizeName(typed)) continue
    const name = catalogName(catalogs.skills, typed)
    if (isTypeScript(name)) {
      problems.preferredStack ??= 'TypeScript can never fill a Stack Layer'
    } else if (
      Object.values(preferredStack).some((other) => sameName(other, name))
    ) {
      problems.preferredStack ??= `${name} can only fill one Stack Layer`
    } else {
      preferredStack[layer] = name
    }
  }
  if (Object.keys(preferredStack).length === 0) {
    problems.preferredStack ??= 'Fill at least one Stack Layer'
  }

  if (!details.ok || Object.keys(problems).length > 0) return { ok: false, problems }
  return { ok: true, profile: { ...details.details, preferredStack } }
}

// The parts of a profile that count toward how complete it is.
export type CompletenessProfile = {
  details: Pick<DetailsForm, 'workArrangements' | 'location'>
  techStack: { name: string; stackLayer: StackLayer | null }[]
  links: LinksForm
}

export type Completeness = {
  // A whole percent: 14 right after signup, up to 100.
  percent: number
  // The first part still missing, such as "add your Resume", or null when
  // the profile is complete.
  next: string | null
}

// How much of a profile is filled out. Every part has equal weight: the
// required signup fields, every Stack Layer filled, at least one Secondary
// Skill, and each optional Link other than Custom Links. The signup fields
// count once Location and Work Arrangement are there, which Members who
// signed up before those existed lack. TypeScript doesn't count as a
// Secondary Skill, so the TypeScript Badge leaves the percentage alone.
export function profileCompleteness(profile: CompletenessProfile): Completeness {
  const filledLayers = new Set(profile.techStack.map((skill) => skill.stackLayer))
  // The parts beyond the signup fields.
  const optionalParts: { filled: boolean; next: string }[] = [
    {
      filled: stackLayers.every((layer) => filledLayers.has(layer)),
      next: 'fill every Stack Layer in your Preferred Stack',
    },
    {
      filled: profile.techStack.some(
        (skill) => !skill.stackLayer && !isTypeScript(skill.name),
      ),
      next: 'add a Secondary Skill',
    },
    ...optionalLinks.map(({ kind, label }) => ({
      filled: profile.links[kind].trim() !== '',
      // "Resume URL" asks for "your Resume", "X profile URL" for "your X profile".
      next: `add your ${label.replace(/ URL$/, '')}`,
    })),
  ]
  const parts = [
    {
      filled: hasWhereToWork(profile.details),
      next: 'add your Location and Work Arrangement',
    },
    ...optionalParts,
  ]
  const filled = parts.filter((part) => part.filled).length
  return {
    percent: Math.round((filled / parts.length) * 100),
    next: parts.find((part) => !part.filled)?.next ?? null,
  }
}

// What a save returns: success, or what blocked it.
export type SaveResult<Failure> = { ok: true } | ({ ok: false } & Failure)

export function profileProblems(
  form: ProfileForm,
  catalogs: Catalogs,
): ProfileProblems {
  const check = checkProfile(form, catalogs)
  return check.ok ? {} : check.problems
}

export function detailsProblems(
  form: DetailsForm,
  catalogs: Catalogs,
): ProfileProblems {
  const check = checkDetails(form, catalogs)
  return check.ok ? {} : check.problems
}

// The canonical name of the Catalog entry a typed name stands for, or the
// typed name tidied up to name a new entry.
function catalogName(
  entries: { name: string; aliases: string[] }[],
  typed: string,
): string {
  return findInCatalog(entries, typed)?.name ?? tidyName(typed)
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
  const choices = catalog.filter((skill) => !isTypeScript(skill.name))
  return [
    ...choices.filter((skill) => skill.suggestedLayer === layer),
    ...choices.filter((skill) => skill.suggestedLayer !== layer),
  ]
}

export function sortSeniorities(chosen: Seniority[]): Seniority[] {
  return inOrder(seniorities, chosen)
}

// The Skill Catalog's name for TypeScript; Aliases such as "TS" resolve to it.
export const typeScript = 'TypeScript'

// True when two names match once case, spaces, dots, hyphens and
// underscores are ignored.
export function sameName(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b)
}

export function isTypeScript(name: string): boolean {
  return sameName(name, typeScript)
}

// Accepts a URL on linkedin.com, with or without "https://".
function toLinkedinUrl(typed: string): string | null {
  return toUrl(typed, 'linkedin.com')
}

// Drops names with nothing to match on, such as "" or " - ".
function nonBlank(names: string[]): string[] {
  return names.filter((name) => normalizeName(name))
}
