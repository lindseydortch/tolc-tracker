import type { JobSearchStatus, Seniority } from './directory'
import { formReader, jobSearchStatusLabels, seniorityLabels } from './profile'

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

export const emptySearch: DirectorySearch = {
  skills: [],
  targetRoles: [],
  seniorities: [],
  jobSearchStatuses: [],
}

export function isEmptySearch(search: DirectorySearch): boolean {
  return Object.values(search).every((chosen) => chosen.length === 0)
}

// A Member's profile as far as search needs it.
type Searchable = {
  targetRoles: string[]
  preferredSeniority: Seniority
  otherSeniorities: Seniority[]
  jobSearchStatus: JobSearchStatus
  primarySkills: string[]
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
  const matches = profiles.filter(
    (profile) =>
      search.skills.every(
        (skill) =>
          skill !== null &&
          (profile.primarySkills.includes(skill) ||
            profile.secondarySkills.includes(skill)),
      ) &&
      anyOf(search.targetRoles, profile.targetRoles) &&
      anyOf(search.jobSearchStatuses, [profile.jobSearchStatus]) &&
      anyOf(search.seniorities, [
        profile.preferredSeniority,
        ...profile.otherSeniorities,
      ]),
  )
  const rank = (profile: Profile) => {
    const allPrimary = search.skills.every(
      (skill) => skill !== null && profile.primarySkills.includes(skill),
    )
    const preferredSeniority =
      search.seniorities.length === 0 ||
      search.seniorities.includes(profile.preferredSeniority)
    return (allPrimary ? 0 : 2) + (preferredSeniority ? 0 : 1)
  }
  // `sort` is stable, so equal ranks keep their order.
  return matches.sort((a, b) => rank(a) - rank(b))
}

// Reads a search from the Quick View's URL, which anyone can edit, so
// anything unexpected is dropped rather than refused.
export function searchFromUrl(params: Record<string, unknown>): DirectorySearch {
  const strings = (value: unknown) =>
    (Array.isArray(value) ? value : [value]).filter(
      (item): item is string => typeof item === 'string',
    )
  const oneOf = <T extends string>(value: unknown, labels: Record<T, string>) =>
    strings(value).filter((item): item is T => Object.hasOwn(labels, item))
  return {
    skills: strings(params.skills),
    targetRoles: strings(params.targetRoles),
    seniorities: oneOf(params.seniorities, seniorityLabels),
    jobSearchStatuses: oneOf(params.jobSearchStatuses, jobSearchStatusLabels),
  }
}

// Checks the shape of a search sent to the server, where it can't be trusted.
export function parseDirectorySearch(input: unknown): DirectorySearch {
  const read = formReader(input, 'Directory search')
  const names = (field: string) =>
    read.list(field).map((name) => (typeof name === 'string' ? name : read.fail(field)))
  return {
    skills: names('skills'),
    targetRoles: names('targetRoles'),
    seniorities: read
      .list('seniorities')
      .map((value) => read.oneOf('seniorities', value, seniorityLabels)),
    jobSearchStatuses: read
      .list('jobSearchStatuses')
      .map((value) => read.oneOf('jobSearchStatuses', value, jobSearchStatusLabels)),
  }
}
