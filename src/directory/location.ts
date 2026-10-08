// Rules for where a Member lives and would work: Work Arrangement,
// Location, Wants to Work From and Willing to Relocate. Shared by the
// browser and the server, so it imports no database code.
import type { WorkArrangement } from './directory'
import { inOrder } from './in-order'
import { tidyName } from './normalize-name'

export const workArrangementLabels: Record<WorkArrangement, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  inPerson: 'In Person',
}

export const workArrangements = Object.keys(workArrangementLabels) as WorkArrangement[]

export function sortWorkArrangements(chosen: WorkArrangement[]): WorkArrangement[] {
  return inOrder(workArrangements, chosen)
}

// A Wants to Work From place. Only `country` is required; a blank City or
// State/Region is ''.
export type Place = { city: string; region: string; country: string }

export const emptyPlace: Place = { city: '', region: '', country: '' }

// Where a Member lives now. `timeZone` is an IANA name, such as
// "America/Chicago"; State/Region is optional.
export type Location = Place & { timeZone: string }

// The browser fills in its own Time Zone.
export const emptyLocation: Location = { ...emptyPlace, timeZone: '' }

// The profile fields this module checks, as the details form holds them.
export type WhereToWork = {
  workArrangements: WorkArrangement[]
  location: Location
  wantsToWorkFrom: Place[]
  willingToRelocate: boolean
}

// The fields that can block a save. The Location's parts each get their own.
export type WhereToWorkField =
  | 'workArrangements'
  | 'city'
  | 'country'
  | 'timeZone'
  | 'wantsToWorkFrom'

export type WhereToWorkCheck = {
  problems: Partial<Record<WhereToWorkField, string>>
  // The fields tidied up and in order, with blank Wants to Work From rows
  // dropped. Only meaningful when there are no problems.
  tidied: WhereToWork
}

export function checkWhereToWork(form: WhereToWork): WhereToWorkCheck {
  const problems: WhereToWorkCheck['problems'] = {}
  if (form.workArrangements.length === 0) {
    problems.workArrangements = 'Choose at least one Work Arrangement'
  }
  const location = { ...tidyPlace(form.location), timeZone: form.location.timeZone }
  if (!location.city) problems.city = 'Enter the city you live in'
  if (!location.country) problems.country = 'Enter the country you live in'
  if (!isTimeZone(location.timeZone)) problems.timeZone = 'Choose your Time Zone'

  const wantsToWorkFrom = form.wantsToWorkFrom
    .map(tidyPlace)
    .filter((place) => place.city || place.region || place.country)
  if (wantsToWorkFrom.some((place) => !place.country)) {
    problems.wantsToWorkFrom = 'Add a Country to each place you want to work from'
  }
  return {
    problems,
    tidied: {
      workArrangements: sortWorkArrangements(form.workArrangements),
      location,
      wantsToWorkFrom,
      willingToRelocate: form.willingToRelocate,
    },
  }
}

// A Location as saved, where a part may be missing.
export type SavedLocation = { [Part in keyof Location]: string | null }

// The saved Location, or null until City, Country and a valid Time Zone
// are all there, as for Members who signed up before Location existed.
export function completeLocation(saved: SavedLocation): Location | null {
  const { city, country, timeZone } = saved
  if (!city || !country || !timeZone || !isTimeZone(timeZone)) return null
  return { city, region: saved.region ?? '', country, timeZone }
}

// True once the Member has a Work Arrangement and a complete Location.
export function hasWhereToWork(saved: {
  workArrangements: WorkArrangement[]
  location: SavedLocation
}): boolean {
  return saved.workArrangements.length > 0 && completeLocation(saved.location) !== null
}

// How a card names a place: "Austin, TX, United States", or just "Italy".
export function placeName(place: Place): string {
  return [place.city, place.region, place.country].filter(Boolean).join(', ')
}

// True for an IANA Time Zone name the runtime knows, such as "Europe/Rome".
// Offsets and abbreviations such as "EST" don't count.
export function isTimeZone(name: string): boolean {
  if (!name.includes('/') && name !== 'UTC') return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: name })
    return true
  } catch {
    return false
  }
}

function tidyPlace(place: Place): Place {
  return {
    city: tidyName(place.city),
    region: tidyName(place.region),
    country: tidyName(place.country),
  }
}
