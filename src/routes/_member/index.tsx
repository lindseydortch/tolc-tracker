import { createFileRoute } from '@tanstack/react-router'
import { useSignOut } from '../../auth/use-sign-out'

export const Route = createFileRoute('/_member/')({ component: QuickView })

function QuickView() {
  const { member } = Route.useRouteContext()
  const signOut = useSignOut()

  return (
    <main>
      <h1>TOLC Tracker</h1>
      <p>Signed in as {member.name}.</p>
      {member.githubUrl && (
        <p>
          GitHub: <a href={member.githubUrl}>{member.githubUrl}</a>
        </p>
      )}
      <p>Discord: {member.discordHandle}</p>
      <p>The Directory is coming soon.</p>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  )
}
