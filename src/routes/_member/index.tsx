import { Link, createFileRoute } from '@tanstack/react-router'
import { useSignOut } from '../../auth/use-sign-out'
import { getDirectory } from '../../directory/directory-fns'
import { MemberCardDetails } from '../../directory/member-card'
import { SearchForm } from '../../directory/search-form'
import {
  emptySearch,
  isEmptySearch,
  searchFromUrl,
  type DirectorySearch,
} from '../../directory/search'

export const Route = createFileRoute('/_member/')({
  // Only the filters in use go in the URL, so a plain "/" is the whole
  // Directory and links to it need no search.
  validateSearch: (params): Partial<DirectorySearch> =>
    withoutEmpty(searchFromUrl(params)),
  loaderDeps: ({ search }) => ({ ...emptySearch, ...search }),
  loader: ({ deps }) => getDirectory({ data: deps }),
  component: QuickView,
})

function withoutEmpty(search: DirectorySearch): Partial<DirectorySearch> {
  return Object.fromEntries(
    Object.entries(search).filter(([, chosen]) => chosen.length > 0),
  )
}

function QuickView() {
  const { member } = Route.useRouteContext()
  const { entries, catalogs } = Route.useLoaderData()
  const search = Route.useLoaderDeps()
  const navigate = Route.useNavigate()
  const signOut = useSignOut()
  const searching = !isEmptySearch(search)

  return (
    <main>
      <h1>TOLC Tracker</h1>
      <p>
        Signed in as {member.name} ({member.discordHandle}).{' '}
        <Link to="/edit-profile">Edit your profile</Link>{' '}
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </p>
      <h2>Search the Directory</h2>
      <SearchForm
        // Starts the form afresh when the URL's search changes.
        key={JSON.stringify(search)}
        search={search}
        catalogs={catalogs}
        onSearch={(chosen) => navigate({ search: withoutEmpty(chosen) })}
      />
      <h2>{searching ? 'Search results' : 'Directory'}</h2>
      {searching && (
        <p role="status">
          {entries.length === 1 ? '1 Member' : `${entries.length} Members`} found.
        </p>
      )}
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              to="/members/$memberId"
              params={{ memberId: String(entry.id) }}
            >
              <MemberCardDetails entry={entry} />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
