import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { LayoutGrid, LogOut, ShieldCheck, UserPen } from 'lucide-react'
import { landingPage, requireSignedInMember } from '../auth/session'
import { useSignOut } from '../auth/use-sign-out'
import { Wordmark } from '../ui/marks'

// Every page under this layout is for signed-in Members with Discord
// connected who are in TOLC. Everyone else is sent to their `landingPage`.
export const Route = createFileRoute('/_member')({
  beforeLoad: async () => {
    const member = await requireSignedInMember()
    const page = landingPage(member)
    const { discordHandle } = member
    if (page !== '/' || !discordHandle) throw redirect({ to: page })
    // Pages below can rely on the handle being present.
    return { member: { ...member, discordHandle } }
  },
  component: MemberLayout,
})

function MemberLayout() {
  const { member } = Route.useRouteContext()
  const signOut = useSignOut()

  return (
    <>
      <header className="topbar">
        <Wordmark />
        <nav className="topnav" aria-label="Main">
          <Link to="/" activeOptions={{ exact: true, includeSearch: false }}>
            <LayoutGrid size={16} aria-hidden="true" />
            <span>Directory</span>
          </Link>
          <Link to="/edit-profile">
            <UserPen size={16} aria-hidden="true" />
            <span>Edit your profile</span>
          </Link>
          {member.isAdmin && (
            <Link to="/admin">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Admin</span>
            </Link>
          )}
        </nav>
        <div className="topbar-me">
          <p className="me">
            <span className="me-name">Signed in as {member.name}</span>
            <span className="me-handle">{member.discordHandle}</span>
          </p>
          <button type="button" className="btn btn-quiet" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </header>
      <Outlet />
    </>
  )
}
