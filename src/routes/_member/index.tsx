import { Link, createFileRoute } from '@tanstack/react-router'
import { useSignOut } from '../../auth/use-sign-out'
import { getDirectory } from '../../directory/directory-fns'
import { MemberCardDetails } from '../../directory/member-card'

export const Route = createFileRoute('/_member/')({
  loader: () => getDirectory(),
  component: QuickView,
})

function QuickView() {
  const { member } = Route.useRouteContext()
  const entries = Route.useLoaderData()
  const signOut = useSignOut()

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
      <h2>Directory</h2>
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
