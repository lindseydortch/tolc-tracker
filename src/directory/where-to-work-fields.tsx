import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { WorkArrangement } from './directory'
import {
  emptyPlace,
  workArrangementLabels,
  workArrangements,
  type Location,
  type Place,
} from './location'
import { Problem } from './problem'
import type { DetailsForm, ProfileProblems } from './profile'

// Work Arrangement, Location, Wants to Work From and Willing to Relocate,
// part of the details on the signup form and the profile editor.
export function WhereToWorkFields({
  form,
  update,
  problems,
}: {
  form: DetailsForm
  update: (changes: Partial<DetailsForm>) => void
  problems: ProfileProblems
}) {
  const timeZones = useTimeZones(form.location.timeZone)
  const updateLocation = (changes: Partial<Location>) =>
    update({ location: { ...form.location, ...changes } })
  // An empty Time Zone takes the browser's, which the Member can change.
  const { timeZone } = form.location
  useEffect(() => {
    if (!timeZone) update({ location: { ...form.location, timeZone: browserTimeZone() } })
  }, [timeZone, form.location, update])

  const toggleArrangement = (arrangement: WorkArrangement, chosen: boolean) =>
    update({
      workArrangements: chosen
        ? [...form.workArrangements, arrangement]
        : form.workArrangements.filter((a) => a !== arrangement),
    })
  const updatePlace = (index: number, changes: Partial<Place>) =>
    update({
      wantsToWorkFrom: form.wantsToWorkFrom.map((place, i) =>
        i === index ? { ...place, ...changes } : place,
      ),
    })

  return (
    <>
      <fieldset className="group span-2">
        <legend>Work Arrangement</legend>
        <p className="hint">Choose every one you'd take.</p>
        {workArrangements.map((arrangement) => (
          <label key={arrangement} className="check">
            <input
              type="checkbox"
              checked={form.workArrangements.includes(arrangement)}
              onChange={(e) => toggleArrangement(arrangement, e.target.checked)}
            />
            {workArrangementLabels[arrangement]}
          </label>
        ))}
        <Problem text={problems.workArrangements} />
      </fieldset>

      <fieldset className="group span-2">
        <legend>Location</legend>
        <p className="hint">Where you live now.</p>
        <div className="form-grid">
          <p className="field">
            <label>
              City
              <input
                value={form.location.city}
                onChange={(e) => updateLocation({ city: e.target.value })}
                autoComplete="address-level2"
              />
            </label>
            <Problem text={problems.city} />
          </p>
          <p className="field">
            <label>
              State/Region (optional)
              <input
                value={form.location.region}
                onChange={(e) => updateLocation({ region: e.target.value })}
                autoComplete="address-level1"
              />
            </label>
          </p>
          <p className="field">
            <label>
              Country
              <input
                value={form.location.country}
                onChange={(e) => updateLocation({ country: e.target.value })}
                autoComplete="country-name"
              />
            </label>
            <Problem text={problems.country} />
          </p>
          <p className="field">
            <label>
              Time Zone
              <select
                value={timeZone}
                onChange={(e) => updateLocation({ timeZone: e.target.value })}
              >
                {timeZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>
            <Problem text={problems.timeZone} />
          </p>
        </div>
      </fieldset>

      <fieldset className="group span-2">
        <legend>Wants to Work From</legend>
        <p className="hint">
          Optional. Other places you'd like to work from. Only Country is required.
        </p>
        {form.wantsToWorkFrom.map((place, index) => (
          <p key={index} className="repeat-row">
            <label className="field">
              City
              <input
                value={place.city}
                onChange={(e) => updatePlace(index, { city: e.target.value })}
              />
            </label>
            <label className="field">
              State/Region
              <input
                value={place.region}
                onChange={(e) => updatePlace(index, { region: e.target.value })}
              />
            </label>
            <label className="field">
              Country
              <input
                value={place.country}
                onChange={(e) => updatePlace(index, { country: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="btn-quiet"
              onClick={() =>
                update({
                  wantsToWorkFrom: form.wantsToWorkFrom.filter((_, i) => i !== index),
                })
              }
            >
              <X size={16} aria-hidden="true" />
              Remove
            </button>
          </p>
        ))}
        <button
          type="button"
          className="add-row"
          onClick={() => update({ wantsToWorkFrom: [...form.wantsToWorkFrom, emptyPlace] })}
        >
          <Plus size={16} aria-hidden="true" />
          Add a place
        </button>
        <Problem text={problems.wantsToWorkFrom} />
      </fieldset>

      <fieldset className="group span-2">
        <legend>Willing to Relocate</legend>
        {[true, false].map((willing) => (
          <label key={String(willing)} className="check">
            <input
              type="radio"
              name="willingToRelocate"
              checked={form.willingToRelocate === willing}
              onChange={() => update({ willingToRelocate: willing })}
            />
            {willing ? 'Yes' : 'No'}
          </label>
        ))}
      </fieldset>
    </>
  )
}

// Every IANA Time Zone the browser knows, plus `current` if it doesn't.
// Empty until the page is in the browser: the server's list may differ, and
// the two renders must match.
function useTimeZones(current: string): string[] {
  const [known, setKnown] = useState<string[]>([])
  useEffect(() => setKnown(Intl.supportedValuesOf('timeZone')), [])
  return current && !known.includes(current) ? [current, ...known] : known
}

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
}
