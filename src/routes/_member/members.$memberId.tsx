import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import type { StackLayer } from '../../directory/directory'
import { getMemberProfile } from '../../directory/directory-fns'
import { MemberCardDetails } from '../../directory/member-card'
import { linkKindLabels, stackLayerLabels } from '../../directory/profile'

export const Route = createFileRoute('/_member/members/$memberId')({
  loader: async ({ params }) => {
    const memberId = Number(params.memberId)
    if (!Number.isSafeInteger(memberId)) throw notFound()
    const profile = await getMemberProfile({ data: memberId })
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

const stackLayers = Object.keys(stackLayerLabels) as StackLayer[]

function MemberProfilePage() {
  const profile = Route.useLoaderData()

  return (
    <main>
      <Link to="/">Back to the Directory</Link>
      <MemberCardDetails entry={profile} />
      <p>
        {/* Discord has no link straight into a DM; this opens their Discord
            profile, which has the Message button. */}
        <a
          href={`https://discord.com/users/${profile.discordUserId}`}
          target="_blank"
          rel="noreferrer"
        >
          Message on Discord
        </a>
      </p>

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
