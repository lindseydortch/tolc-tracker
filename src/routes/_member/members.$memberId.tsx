import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { getMemberProfile } from '../../directory/directory-fns'
import { MemberCardDetails } from '../../directory/member-card'
import {
  linkKindLabels,
  stackLayerLabels,
  stackLayers,
} from '../../directory/profile'

export const Route = createFileRoute('/_member/members/$memberId')({
  loader: async ({ params }) => {
    const profile = await getMemberProfile({ data: params.memberId })
    // Hidden Members and incomplete profiles look the same as no Member.
    if (!profile) throw notFound()
    return profile
  },
  component: MemberProfilePage,
  notFoundComponent: () => (
    <main>
      <p>No Member here.</p>
      <Link to="/">Back to the Directory</Link>
    </main>
  ),
})

function MemberProfilePage() {
  const profile = Route.useLoaderData()

  return (
    <main>
      <Link to="/">Back to the Directory</Link>
      <MemberCardDetails entry={profile} />

      <h4>Preferred Stack</h4>
      <dl>
        {stackLayers.map((layer) => (
          <div key={layer}>
            <dt>{stackLayerLabels[layer]}</dt>
            <dd>{profile.preferredStack[layer] ?? 'None'}</dd>
          </div>
        ))}
      </dl>

      <h4>Secondary Skills</h4>
      {profile.secondarySkills.length > 0 ? (
        <p>{profile.secondarySkills.join(', ')}</p>
      ) : (
        <p>None</p>
      )}

      <h4>Links</h4>
      <ul>
        {profile.links.map((link) => (
          <li key={`${link.kind} ${link.url}`}>
            <a href={link.url} target="_blank" rel="noreferrer">
              {link.kind === 'custom' && link.label
                ? link.label
                : linkKindLabels[link.kind]}
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
