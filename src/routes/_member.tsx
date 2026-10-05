import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { LayoutGrid, LogOut, ShieldCheck, UserPen } from 'lucide-react'
import { requireOnPage } from '../auth/landing-page'
import { useSignOut } from '../auth/use-sign-out'
import { Wordmark } from '../ui/marks'

// Every page under this layout is for signed-in Members with Discord
// connected who are in TOLC. Everyone else is sent to their `landingPage`.
// A recent sign-in check is reused, so page changes don't wait on the
// server; each page's server functions check access again.
export const Route = createFileRoute('/_member')({
  beforeLoad: async ({ context }) => {
    const member = requireOnPage(await context.signIn.checkRecent(), '/')
    const { discordHandle } = member
    if (!discordHandle) throw redirect({ to: '/connect-discord' })
    // Pages below can rely on the handle being present.
    return { member: { ...member, discordHandle } }
  },
  component: MemberLayout,
})

function MemberLayout() {
  const { member } = Route.useRouteContext()
  const router = useRouter()
  const signOut = useSignOut()

  // A page loaded from the server comes with the server's `beforeLoad`
  // result, and the browser doesn't run it again. Remember that check, so
  // the first hover or click after the page loads doesn't ask again.
  useEffect(() => {
    router.options.context.signIn.remember(member)
  }, [router, member])

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
