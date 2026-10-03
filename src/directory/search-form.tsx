import { useState } from 'react'
import type { JobSearchStatus, Seniority } from './directory'
import {
  findInCatalog,
  jobSearchStatusLabels,
  seniorities,
  seniorityLabels,
  type Catalogs,
} from './profile'
import { emptySearch, type DirectorySearch } from './search'

const jobSearchStatuses = Object.keys(jobSearchStatusLabels) as JobSearchStatus[]

// The Quick View's search form. Unstyled until the design references land.
// Nothing is searched until it's sent with `onSearch`.
export function SearchForm({
  search,
  catalogs,
  onSearch,
}: {
  search: DirectorySearch
  catalogs: Catalogs
  onSearch: (search: DirectorySearch) => void
}) {
  const [draft, setDraft] = useState(search)
  const update = (changes: Partial<DirectorySearch>) =>
    setDraft((old) => ({ ...old, ...changes }))

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(draft)
      }}
    >
      <NamesField
        legend="Skills"
        hint="Members must have every Skill chosen."
        catalog={catalogs.skills}
        chosen={draft.skills}
        onChange={(skills) => update({ skills })}
      />
      <NamesField
        legend="Target Roles"
        hint="Members with any of these."
        catalog={catalogs.roles}
        chosen={draft.targetRoles}
        onChange={(targetRoles) => update({ targetRoles })}
      />
      <ChoicesField
        legend="Seniority"
        hint="Members who prefer or would accept any of these."
        choices={seniorities}
        labels={seniorityLabels}
        chosen={draft.seniorities}
        onChange={(chosen: Seniority[]) => update({ seniorities: chosen })}
      />
      <ChoicesField
        legend="Job Search Status"
        hint="Members with any of these."
        choices={jobSearchStatuses}
        labels={jobSearchStatusLabels}
        chosen={draft.jobSearchStatuses}
        onChange={(chosen: JobSearchStatus[]) => update({ jobSearchStatuses: chosen })}
      />
      <button type="submit">Search</button>{' '}
      <button
        type="button"
        onClick={() => {
          setDraft(emptySearch)
          onSearch(emptySearch)
        }}
      >
        Clear search
      </button>
    </form>
  )
}

// Skills or Target Roles, picked one at a time from a Catalog by name or Alias.
function NamesField({
  legend,
  hint,
  catalog,
  chosen,
  onChange,
}: {
  legend: string
  hint: string
  catalog: { name: string; aliases: string[] }[]
  chosen: string[]
  onChange: (chosen: string[]) => void
}) {
  const [typed, setTyped] = useState('')
  const listId = `search-${legend.toLowerCase().replace(/\s+/g, '-')}`
  const entry = findInCatalog(catalog, typed)
  const add = () => {
    if (!entry || chosen.includes(entry.name)) return
    onChange([...chosen, entry.name])
    setTyped('')
  }

  return (
    <fieldset>
      <legend>{legend}</legend>
      <p>{hint}</p>
      <ul>
        {chosen.map((name) => (
          <li key={name}>
            {name}{' '}
            <button
              type="button"
              aria-label={`Remove ${name}`}
              onClick={() => onChange(chosen.filter((other) => other !== name))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <datalist id={listId}>
        {catalog.map((option) => (
          <option key={option.name} value={option.name}>
            {option.aliases.join(', ')}
          </option>
        ))}
      </datalist>
      <label>
        Add a {legend === 'Skills' ? 'Skill' : 'Target Role'}{' '}
        <input
          list={listId}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            // Enter adds the name instead of sending the form.
            e.preventDefault()
            add()
          }}
        />
      </label>{' '}
      <button type="button" disabled={!entry} onClick={add}>
        Add
      </button>
      {typed.trim() && !entry && <span> Not in the Catalog</span>}
    </fieldset>
  )
}

function ChoicesField<T extends string>({
  legend,
  hint,
  choices,
  labels,
  chosen,
  onChange,
}: {
  legend: string
  hint: string
  choices: T[]
  labels: Record<T, string>
  chosen: T[]
  onChange: (chosen: T[]) => void
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <p>{hint}</p>
      {choices.map((choice) => (
        <label key={choice}>
          <input
            type="checkbox"
            checked={chosen.includes(choice)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? choices.filter((c) => c === choice || chosen.includes(c))
                  : chosen.filter((c) => c !== choice),
              )
            }
          />{' '}
          {labels[choice]}{' '}
        </label>
      ))}
    </fieldset>
  )
}
