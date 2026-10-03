import { createFileRoute, useRouter } from '@tanstack/react-router'
import { authClient } from '../../auth/auth-client'

export const Route = createFileRoute('/_member/')({ component: QuickView })

function QuickView() {
  const { member } = Route.useRouteContext()
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    await router.navigate({ to: '/sign-in' })
  }

  return (
    <main>
      <h1>TOLC Tracker</h1>
      <p>Signed in as {member.name}.</p>
      {member.githubUrl && (
        <p>
          GitHub: <a href={member.githubUrl}>{member.githubUrl}</a>
        </p>
      )}
      <p>The Directory is coming soon.</p>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  )
}
