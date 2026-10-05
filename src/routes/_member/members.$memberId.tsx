import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft, Check, Copy, ExternalLink, FileText, Globe, Link2 } from 'lucide-react'
import { useState } from 'react'
import { getMemberProfile } from '../../directory/directory-fns'
import { MemberBadge } from '../../directory/member-card'
import { NotFoundPage } from '../../not-found-page'
import {
  linkKindLabels,
  stackLayerLabels,
  stackLayers,
} from '../../directory/profile'
import type { MemberLink } from '../../directory/directory'
import { Lanyard } from '../../ui/lanyard'
import { GitHubMark } from '../../ui/marks'

export const Route = createFileRoute('/_member/members/$memberId')({
  loader: async ({ params }) => {
    const profile = await getMemberProfile({ data: params.memberId })
    // Hidden Members and incomplete profiles look the same as no Member.
    if (!profile) throw notFound()
    return profile
  },
  component: MemberProfilePage,
  notFoundComponent: () => <NotFoundPage message="No Member here." />,
})

function MemberProfilePage() {
  const profile = Route.useLoaderData()

  return (
    <main className="page">
      <Link to="/" className="back">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to the Directory
      </Link>
      <div className="profile">
        <div className="profile-badge">
          <div className="profile-hang">
            <Lanyard />
          </div>
          <MemberBadge entry={profile} titleAs="h1" />
          <CopyHandle handle={profile.discordHandle} />
        </div>

        <div className="profile-sections">
          <section className="profile-section">
            <h2>Preferred Stack</h2>
            <dl className="layers">
              {stackLayers.map((layer) => {
                const skill = profile.preferredStack[layer]
                return (
                  <div key={layer} className={skill ? 'layer' : 'layer layer-empty'}>
                    <dt>{stackLayerLabels[layer]}</dt>
                    <dd>{skill ?? 'None'}</dd>
                  </div>
                )
              })}
            </dl>
          </section>

          <section className="profile-section">
            <h2>Secondary Skills</h2>
            {profile.secondarySkills.length > 0 ? (
              <ul className="chips">
                {profile.secondarySkills.map((skill) => (
                  <li key={skill} className="chip">
                    {skill}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">None</p>
            )}
          </section>

          <section className="profile-section">
            <h2>Links</h2>
            <ul className="link-list">
              {profile.links.map((link) => (
                <li key={`${link.kind} ${link.url}`}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    <LinkIcon kind={link.kind} />
                    {link.kind === 'custom' && link.label
                      ? link.label
                      : linkKindLabels[link.kind]}
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  )
}

function LinkIcon({ kind }: { kind: MemberLink['kind'] }) {
  if (kind === 'github') return <GitHubMark size={16} />
  if (kind === 'resume') return <FileText size={16} aria-hidden="true" />
  if (kind === 'portfolio') return <Globe size={16} aria-hidden="true" />
  return <Link2 size={16} aria-hidden="true" />
}

// Copies the Discord handle, so the Member can message them about a role.
function CopyHandle({ handle }: { handle: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(handle)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button type="button" className="btn-primary btn-lg copy-handle" onClick={copy}>
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy Discord handle'}</span>
    </button>
  )
}
