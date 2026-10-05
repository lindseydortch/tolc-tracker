// Signup form rules shared by the browser and the server. Imports no
// database code, so routes can use it client-side.
import type {
  CatalogSkill,
  CatalogTargetRole,
  JobSearchStatus,
  LinkKind,
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

// Custom Links show their own label instead.
export const linkKindLabels: Record<LinkKind, string> = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  resume: 'Resume',
  portfolio: 'Portfolio',
  x: 'X',
  bluesky: 'Bluesky',
  custom: 'Custom',
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
// Catalogs, and names not in them become new entries.
export type DetailsForm = {
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
  preferredStack: {},
}

export type ProfileField = Exclude<keyof ProfileForm, 'otherSeniorities'>

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

// What a save returns: success, or what blocked it.
export type SaveResult<Failure> = { ok: true } | ({ ok: false } & Failure)

// The optional Links other than Custom Links, one of each per Member.
export const optionalLinks = [
  {
    kind: 'resume',
    label: 'Resume URL',
    placeholder: 'https://example.com/resume.pdf',
    problem: 'Enter your resume as a URL',
  },
  {
    kind: 'portfolio',
    label: 'Portfolio URL',
    placeholder: 'https://example.com',
    problem: 'Enter your portfolio as a URL',
  },
  {
    kind: 'x',
    label: 'X profile URL',
    placeholder: 'https://x.com/you',
    problem: 'Enter your X profile as a URL',
  },
  {
    kind: 'bluesky',
    label: 'Bluesky profile URL',
    placeholder: 'https://bsky.app/profile/you',
    problem: 'Enter your Bluesky profile as a URL',
  },
] as const

export type OptionalLinkKind = (typeof optionalLinks)[number]['kind']

// The optional Links. A blank URL means the Member has no such Link.
export type LinksForm = Record<OptionalLinkKind, string> & {
  custom: CustomLinkForm[]
}

export type CustomLinkForm = { label: string; url: string }

export type LinksProblems = Partial<
  Record<OptionalLinkKind, string> & {
    // One entry per Custom Link, undefined where it is fine.
    custom: (string | undefined)[]
  }
>

export type LinksCheck =
  | { ok: true; links: LinksForm }
  | { ok: false; problems: LinksProblems }

export function checkLinks(form: LinksForm): LinksCheck {
  const problems: LinksProblems = {}
  const links: LinksForm = { resume: '', portfolio: '', x: '', bluesky: '', custom: [] }
  for (const { kind, problem } of optionalLinks) {
    if (!form[kind].trim()) continue
    const url = toUrl(form[kind])
    if (url) links[kind] = url
    else problems[kind] = problem
  }

  const custom = form.custom.map((link) => ({
    label: link.label.trim(),
    url: toUrl(link.url),
  }))
  const customProblems = custom.map((link) => {
    if (!link.label) return 'Enter a label'
    if (!link.url) return 'Enter a URL'
    return undefined
  })
  if (customProblems.some(Boolean)) problems.custom = customProblems
  links.custom = custom.map(({ label, url }) => ({ label, url: url ?? '' }))

  if (Object.keys(problems).length > 0) return { ok: false, problems }
  return { ok: true, links }
}

export function linksProblems(form: LinksForm): LinksProblems {
  const check = checkLinks(form)
  return check.ok ? {} : check.problems
}

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
  return seniorities.filter((seniority) => chosen.includes(seniority))
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

// How a new Catalog entry spells a typed name: as typed, minus extra spaces.
export function tidyName(typed: string): string {
  return typed.trim().replace(/\s+/g, ' ')
}

// Accepts a URL on linkedin.com, with or without "https://".
function toLinkedinUrl(typed: string): string | null {
  return toUrl(typed, 'linkedin.com')
}

// Accepts an http(s) URL, with or without "https://", on `site` or its
// subdomains if given.
function toUrl(typed: string, site?: string): string | null {
  const trimmed = typed.trim()
  if (!trimmed) return null
  let url: URL
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.toLowerCase()
  if (!host.includes('.')) return null
  if (site && host !== site && !host.endsWith(`.${site}`)) return null
  return url.toString()
}

// Drops names with nothing to match on, such as "" or " - ".
function nonBlank(names: string[]): string[] {
  return names.filter((name) => normalizeName(name))
}

// Checks the shape of a form sent to the server, where it can't be trusted.
// Throws on anything that isn't a ProfileForm; `checkProfile` then decides
// whether it's complete.
export function parseProfileForm(input: unknown): ProfileForm {
  const read = formReader(input, 'signup form')
  const stack = read.form.preferredStack
  if (typeof stack !== 'object' || stack === null) read.fail('preferredStack')
  const preferredStack: PreferredStack = {}
  for (const [layer, name] of Object.entries(stack as object)) {
    if (name === undefined) continue
    if (typeof name !== 'string') read.fail('preferredStack')
    preferredStack[read.oneOf('preferredStack', layer, stackLayerLabels)] = name
  }
  return { ...readDetails(read), preferredStack }
}

export function parseDetailsForm(input: unknown): DetailsForm {
  return readDetails(formReader(input, 'profile details'))
}

export function parseLinksForm(input: unknown): LinksForm {
  const read = formReader(input, 'Links')
  const links: LinksForm = {
    resume: '',
    portfolio: '',
    x: '',
    bluesky: '',
    custom: read.list('custom').map((link) => {
      const custom = formReader(link, 'Custom Link')
      return { label: custom.text('label'), url: custom.text('url') }
    }),
  }
  for (const { kind } of optionalLinks) links[kind] = read.text(kind)
  return links
}

export type AddSkillForm = {
  skill: string
  stackLayer: StackLayer | null
  // True once the Member agreed to replace the Skill in that Stack Layer.
  replace: boolean
}

export function parseAddSkillForm(input: unknown): AddSkillForm {
  const read = formReader(input, 'Skill')
  return {
    skill: read.text('skill'),
    stackLayer:
      read.form.stackLayer === null
        ? null
        : read.oneOf('stackLayer', read.form.stackLayer, stackLayerLabels),
    replace: read.flag('replace'),
  }
}

export function parseSkillName(input: unknown): { skill: string } {
  return { skill: formReader(input, 'Skill').text('skill') }
}

export function parseTypeScriptBadge(input: unknown): { on: boolean } {
  return { on: formReader(input, 'TypeScript Badge').flag('on') }
}

function readDetails(read: FormReader): DetailsForm {
  const { form } = read
  return {
    firstName: read.text('firstName'),
    lastName: read.text('lastName'),
    linkedinUrl: read.text('linkedinUrl'),
    jobSearchStatus:
      form.jobSearchStatus === null
        ? null
        : read.oneOf('jobSearchStatus', form.jobSearchStatus, jobSearchStatusLabels),
    targetRoles: read.list('targetRoles').map((name) =>
      typeof name === 'string' ? name : read.fail('targetRoles'),
    ),
    preferredSeniority:
      form.preferredSeniority === null
        ? null
        : read.oneOf('preferredSeniority', form.preferredSeniority, seniorityLabels),
    otherSeniorities: read.list('otherSeniorities').map((value) =>
      read.oneOf('otherSeniorities', value, seniorityLabels),
    ),
  }
}

type FormReader = ReturnType<typeof formReader>

export function formReader(input: unknown, formName: string) {
  const fail = (field: string): never => {
    throw new Error(`Malformed ${formName}: ${field}`)
  }
  if (typeof input !== 'object' || input === null) fail('not an object')
  const form = input as Record<string, unknown>
  return {
    form,
    fail,
    text: (field: string) =>
      typeof form[field] === 'string' ? form[field] : fail(field),
    flag: (field: string) =>
      typeof form[field] === 'boolean' ? form[field] : fail(field),
    list: (field: string) =>
      Array.isArray(form[field]) ? (form[field] as unknown[]) : fail(field),
    oneOf: <T extends string>(field: string, value: unknown, labels: Record<T, string>) =>
      typeof value === 'string' && Object.hasOwn(labels, value) ? (value as T) : fail(field),
  }
}
