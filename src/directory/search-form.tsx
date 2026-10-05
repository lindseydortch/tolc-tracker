import { Plus, Search, X } from 'lucide-react'
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

// The Quick View's search form, shown in the filter rail.
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
      className="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(draft)
      }}
    >
      <NamesField
        legend="Skills"
        noun="Skill"
        catalogName="Skill Catalog"
        hint="Members must have every Skill chosen."
        catalog={catalogs.skills}
        chosen={draft.skills}
        onChange={(skills) => update({ skills })}
      />
      <NamesField
        legend="Target Roles"
        noun="Target Role"
        catalogName="Role Catalog"
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
        swatches
      />
      <div className="search-actions">
        <button type="submit" className="btn-primary">
          <Search size={16} aria-hidden="true" />
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(emptySearch)
            onSearch(emptySearch)
          }}
        >
          Clear search
        </button>
      </div>
    </form>
  )
}

// Skills or Target Roles, picked one at a time from a Catalog by name or Alias.
function NamesField({
  legend,
  noun,
  catalogName,
  hint,
  catalog,
  chosen,
  onChange,
}: {
  legend: string
  // What one chosen name is, such as "Skill".
  noun: string
  catalogName: 'Skill Catalog' | 'Role Catalog'
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
    <fieldset className="filter">
      <legend>{legend}</legend>
      <p className="hint">{hint}</p>
      {chosen.length > 0 && (
        <ul className="chips">
          {chosen.map((name) => (
            <li key={name} className="chip chip-removable">
              {name}
              <button
                type="button"
                className="chip-remove"
                aria-label={`Remove ${name}`}
                onClick={() => onChange(chosen.filter((other) => other !== name))}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <datalist id={listId}>
        {catalog.map((option) => (
          <option key={option.name} value={option.name}>
            {option.aliases.join(', ')}
          </option>
        ))}
      </datalist>
      <div className="filter-add">
        <label className="visually-hidden" htmlFor={`${listId}-input`}>
          Add a {noun}
        </label>
        <input
          id={`${listId}-input`}
          list={listId}
          placeholder={`Add a ${noun}`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            // Enter adds the name instead of sending the form.
            e.preventDefault()
            add()
          }}
        />
        <button type="button" className="btn-icon" disabled={!entry} onClick={add} aria-label="Add">
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      {typed.trim() && !entry && <span className="resolved">Not in the {catalogName}</span>}
    </fieldset>
  )
}

// A fixed set of choices, such as Seniorities, ticked in any combination.
// Chosen values stay in the order `choices` lists them.
function ChoicesField<T extends string>({
  legend,
  hint,
  choices,
  labels,
  chosen,
  onChange,
  swatches = false,
}: {
  legend: string
  hint: string
  choices: T[]
  labels: Record<T, string>
  chosen: T[]
  onChange: (chosen: T[]) => void
  // Shows each choice's ribbon colour, for Job Search Status.
  swatches?: boolean
}) {
  return (
    <fieldset className="filter">
      <legend>{legend}</legend>
      <p className="hint">{hint}</p>
      <div className="toggles">
      {choices.map((choice) => (
        <label key={choice} className="toggle" data-status={swatches ? choice : undefined}>
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
          />
          {swatches && <span className="toggle-swatch" aria-hidden="true" />}
          {labels[choice]}
        </label>
      ))}
      </div>
    </fieldset>
  )
}
