import type { JobSearchStatus, Seniority } from './directory'
import {
  jobSearchStatusLabels,
  seniorityLabels,
  type PreferredStack,
} from './profile'
import { formReader } from './profile-parsing'

// What a Member searches the Directory by. An empty list doesn't filter.
// Skills and Target Roles are typed names or Aliases.
export type DirectorySearch = {
  // A Member must have every one of these.
  skills: string[]
  // These three keep Members with any one of the chosen values.
  targetRoles: string[]
  seniorities: Seniority[]
  jobSearchStatuses: JobSearchStatus[]
}

// Every search field, with the labels its values must be one of, or null
// for typed names. Adding a field here adds it everywhere a search is read.
const searchFields: {
  [Field in keyof DirectorySearch]: Record<DirectorySearch[Field][number], string> | null
} = {
  skills: null,
  targetRoles: null,
  seniorities: seniorityLabels,
  jobSearchStatuses: jobSearchStatusLabels,
}

// Builds a search by reading each field's values with `read`.
function readSearch(
  read: (field: keyof DirectorySearch, labels: Record<string, string> | null) => string[],
): DirectorySearch {
  const search: Record<string, string[]> = {}
  for (const [field, labels] of Object.entries(searchFields)) {
    search[field] = read(field as keyof DirectorySearch, labels)
  }
  return search as DirectorySearch
}

export const emptySearch: DirectorySearch = readSearch(() => [])

export function isEmptySearch(search: DirectorySearch): boolean {
  return Object.values(search).every((chosen) => chosen.length === 0)
}

// A Member's profile as far as search needs it.
type Searchable = {
  targetRoles: string[]
  preferredSeniority: Seniority
  otherSeniorities: Seniority[]
  jobSearchStatus: JobSearchStatus
  preferredStack: PreferredStack
  secondarySkills: string[]
}

// The search with Skills and Target Roles resolved to canonical Catalog
// names, or null for any name the Catalog doesn't have.
export type ResolvedSearch = Omit<DirectorySearch, 'skills' | 'targetRoles'> & {
  skills: (string | null)[]
  targetRoles: (string | null)[]
}

// The matching profiles, best first. Members with every chosen Skill as a
// Primary Skill come before those with any as a Secondary Skill; within
// each, a Preferred Seniority match comes before an accepted one. Ties keep
// their order in `profiles`.
export function rankSearchResults<Profile extends Searchable>(
  profiles: Profile[],
  search: ResolvedSearch,
): Profile[] {
  const anyOf = <T>(chosen: T[], has: T[]) =>
    chosen.length === 0 || chosen.some((value) => has.includes(value))
  const isPrimary = (profile: Profile, skill: string | null) =>
    skill !== null && Object.values(profile.preferredStack).includes(skill)
  const hasSkill = (profile: Profile, skill: string | null) =>
    isPrimary(profile, skill) ||
    (skill !== null && profile.secondarySkills.includes(skill))
  const matches = profiles.filter(
    (profile) =>
      search.skills.every((skill) => hasSkill(profile, skill)) &&
      anyOf(search.targetRoles, profile.targetRoles) &&
      anyOf(search.jobSearchStatuses, [profile.jobSearchStatus]) &&
      anyOf(search.seniorities, [
        profile.preferredSeniority,
        ...profile.otherSeniorities,
      ]),
  )
  // In order of importance: a later rule only decides between Members the
  // earlier ones rank equally. Members a rule holds for come first.
  const rankingRules = [
    (profile: Profile) => search.skills.every((skill) => isPrimary(profile, skill)),
    (profile: Profile) =>
      search.seniorities.length === 0 ||
      search.seniorities.includes(profile.preferredSeniority),
  ]
  // `sort` is stable, so Members every rule ranks equally keep their order.
  return matches.sort((a, b) => {
    for (const rule of rankingRules) {
      if (rule(a) !== rule(b)) return rule(a) ? -1 : 1
    }
    return 0
  })
}

// The search as the Quick View's URL holds it: only the filters in use, so
// a plain "/" is the whole Directory and links to it need no search.
export function searchToUrl(search: DirectorySearch): Partial<DirectorySearch> {
  return Object.fromEntries(
    Object.entries(search).filter(([, chosen]) => chosen.length > 0),
  )
}

// Reads a search from the Quick View's URL, which anyone can edit, so
// anything unexpected is dropped rather than refused.
export function searchFromUrl(params: Record<string, unknown>): DirectorySearch {
  return readSearch((field, labels) => {
    const value = params[field]
    return (Array.isArray(value) ? value : [value]).filter(
      (item): item is string =>
        typeof item === 'string' && (!labels || Object.hasOwn(labels, item)),
    )
  })
}

// Checks the shape of a search sent to the server, where it can't be trusted.
export function parseDirectorySearch(input: unknown): DirectorySearch {
  const read = formReader(input, 'Directory search')
  return readSearch((field, labels) =>
    read
      .list(field)
      .map((value) =>
        labels
          ? read.oneOf(field, value, labels)
          : typeof value === 'string'
            ? value
            : read.fail(field),
      ),
  )
}
