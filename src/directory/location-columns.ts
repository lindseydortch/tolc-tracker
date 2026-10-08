import { memberWantsToWorkFrom, members } from '../db/schema'

// The Location columns on `members`, selected together; `completeLocation`
// turns them into a Location.
export const locationColumns = {
  city: members.city,
  region: members.region,
  country: members.country,
  timeZone: members.timeZone,
}

// One Wants to Work From place.
export const placeColumns = {
  city: memberWantsToWorkFrom.city,
  region: memberWantsToWorkFrom.region,
  country: memberWantsToWorkFrom.country,
}
