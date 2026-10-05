import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { getDirectory } from '../../directory/directory-fns'
import { MemberBadge } from '../../directory/member-card'
import { SearchForm } from '../../directory/search-form'
import {
  emptySearch,
  isEmptySearch,
  searchFromUrl,
  searchToUrl,
  type DirectorySearch,
} from '../../directory/search'

export const Route = createFileRoute('/_member/')({
  validateSearch: (params): Partial<DirectorySearch> =>
    searchToUrl(searchFromUrl(params)),
  loaderDeps: ({ search }) => ({ ...emptySearch, ...search }),
  loader: ({ deps }) => getDirectory({ data: deps }),
  component: QuickView,
})

function QuickView() {
  const { entries, catalogs } = Route.useLoaderData()
  const search = Route.useLoaderDeps()
  const navigate = Route.useNavigate()
  const searching = !isEmptySearch(search)
  const count = entries.length === 1 ? '1 Member' : `${entries.length} Members`
  const filterCount =
    search.skills.length +
    search.targetRoles.length +
    search.seniorities.length +
    search.jobSearchStatuses.length
  const onSearch = (chosen: DirectorySearch) => navigate({ search: searchToUrl(chosen) })
  // Phones fold the filters away; wider screens always show them.
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <main className="page quick-view">
      <div className="rail" data-open={filtersOpen || undefined}>
        <button
          type="button"
          className="rail-summary"
          aria-expanded={filtersOpen}
          aria-controls="filters"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters
          {filterCount > 0 && <span className="count">{filterCount} on</span>}
          <ChevronDown size={16} className="chev" aria-hidden="true" />
        </button>
        <div className="rail-inner" id="filters">
          <h2 className="rail-title">Search the Directory</h2>
          <SearchForm
            // Starts the form afresh when the URL's search changes.
            key={JSON.stringify(search)}
            search={search}
            catalogs={catalogs}
            onSearch={onSearch}
          />
        </div>
      </div>

      <section aria-labelledby="results-title">
        <div className="results-head">
          <h1 id="results-title">{searching ? 'Search results' : 'Directory'}</h1>
          {searching ? (
            <p className="count" role="status">
              {count} found.
            </p>
          ) : (
            <p className="count">{count}</p>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="empty">
            <div className="empty-badge" aria-hidden="true" />
            {searching ? (
              <>
                <h2>No Members match this search</h2>
                <p>Every Skill chosen must match. Try removing a Skill or widening Seniority.</p>
                <button type="button" onClick={() => onSearch(emptySearch)}>
                  Clear search
                </button>
              </>
            ) : (
              <>
                <h2>No Members yet</h2>
                <p>Profiles show up here once Members finish signing up.</p>
              </>
            )}
          </div>
        ) : (
          <ul className="wall">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link
                  to="/members/$memberId"
                  params={{ memberId: String(entry.id) }}
                  className="badge-link"
                >
                  <MemberBadge entry={entry} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
