import { createFileRoute } from '@tanstack/react-router'
import { useSignOut } from '../../auth/use-sign-out'
import type { StackLayer } from '../../directory/directory'
import { getDirectory } from '../../directory/directory-fns'
import {
  jobSearchStatusLabels,
  seniorityLabels,
  stackLayerLabels,
} from '../../directory/profile'

export const Route = createFileRoute('/_member/')({
  loader: () => getDirectory(),
  component: DirectoryList,
})

const stackLayers = Object.keys(stackLayerLabels) as StackLayer[]

function DirectoryList() {
  const { member } = Route.useRouteContext()
  const entries = Route.useLoaderData()
  const signOut = useSignOut()

  return (
    <main>
      <h1>TOLC Tracker</h1>
      <p>
        Signed in as {member.name} ({member.discordHandle}).{' '}
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </p>
      <h2>Directory</h2>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <h3>
              {entry.firstName} {entry.lastName}
            </h3>
            <p>Discord: {entry.discordHandle}</p>
            <p>{jobSearchStatusLabels[entry.jobSearchStatus]}</p>
            <p>Target Roles: {entry.targetRoles.join(', ')}</p>
            <p>
              Seniority: {seniorityLabels[entry.preferredSeniority]} (preferred)
              {entry.otherSeniorities.map((s) => `, ${seniorityLabels[s]}`)}
            </p>
            <p>
              Primary Skills:{' '}
              {stackLayers
                .flatMap((layer) => entry.preferredStack[layer] ?? [])
                .join(', ')}
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}
