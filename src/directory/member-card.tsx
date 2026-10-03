import type { DirectoryEntry, StackLayer } from './directory'
import {
  jobSearchStatusLabels,
  seniorityLabels,
  stackLayerLabels,
} from './profile'

const stackLayers = Object.keys(stackLayerLabels) as StackLayer[]

// What a Quick View card shows. The profile page repeats it at the top.
export function MemberCardDetails({ entry }: { entry: DirectoryEntry }) {
  return (
    <>
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
      {entry.typeScriptBadge && <p>TypeScript</p>}
    </>
  )
}
