import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DiscordMark } from '../ui/marks'
import type { DirectoryEntry } from './directory'
import { refreshDiscordAvatar } from './directory-fns'
import { jobSearchStatusLabels, seniorityLabels, stackLayers } from './profile'

// What a Quick View card shows, drawn as a conference badge: the punched
// slot, the name, and the Job Search Status ribbon at its foot. The profile
// page repeats it at the top. `titleAs` sets the name's heading level.
export function MemberBadge({
  entry,
  titleAs: Title = 'h3',
  children,
}: {
  entry: DirectoryEntry
  titleAs?: 'h1' | 'h2' | 'h3'
  children?: ReactNode
}) {
  const primarySkills = stackLayers.flatMap((layer) => entry.preferredStack[layer] ?? [])

  return (
    <article className="badge" data-status={entry.jobSearchStatus}>
      {entry.typeScriptBadge && (
        <span className="ts-sticker" role="img" aria-label="TypeScript Badge" title="TypeScript Badge">
          TS
        </span>
      )}
      <div className="badge-body">
        <header className="badge-head">
          <div className="badge-who">
            <BadgePhoto key={entry.discordAvatarUrl} entry={entry} />
            <Title className="badge-name">
              <span className="badge-first">{entry.firstName}</span>{' '}
              <span className="badge-last">{entry.lastName}</span>
            </Title>
          </div>
          <p className="badge-handle">
            <DiscordMark size={14} />
            <span className="visually-hidden">Discord: </span>
            <span>{entry.discordHandle}</span>
          </p>
        </header>
        <dl className="badge-facts">
          <div>
            <dt>Target Roles</dt>
            <dd>{entry.targetRoles.join(', ')}</dd>
          </div>
          <div>
            <dt>Seniority</dt>
            <dd>
              {seniorityLabels[entry.preferredSeniority]}{' '}
              <span className="visually-hidden">(preferred)</span>
              {entry.otherSeniorities.length > 0 && (
                <span className="seniority-other">
                  {' '}
                  · also {entry.otherSeniorities.map((s) => seniorityLabels[s]).join(', ')}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>Primary Skills</dt>
            <dd>
              <ul className="chips">
                {primarySkills.map((skill) => (
                  <li key={skill} className="chip">
                    {skill}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
        {children}
      </div>
      <footer className="ribbon">{jobSearchStatusLabels[entry.jobSearchStatus]}</footer>
    </article>
  )
}

// The Member's Discord avatar, printed on the badge like an ID photo. If it
// stops loading (usually a changed avatar), it asks for the current one
// once; failing that, the Member's initials take its place at the same size.
function BadgePhoto({ entry }: { entry: DirectoryEntry }) {
  const [src, setSrc] = useState(entry.discordAvatarUrl)
  const [status, setStatus] = useState<'showing' | 'refreshing' | 'failed'>('showing')
  const refreshed = useRef(false)
  const image = useRef<HTMLImageElement>(null)

  function handleError() {
    if (refreshed.current) return setStatus('failed')
    refreshed.current = true
    setStatus('refreshing')
    refreshDiscordAvatar({ data: entry.id })
      .then((url) => {
        if (!url || url === src) return setStatus('failed')
        setSrc(url)
        setStatus('showing')
      })
      .catch(() => setStatus('failed'))
  }

  // An image that failed before hydration fired its error event unheard.
  useEffect(() => {
    const loaded = image.current
    if (loaded?.complete && loaded.naturalWidth === 0) handleError()
  }, [])

  return (
    <span className="badge-photo">
      {status === 'failed' && (
        <span aria-hidden="true">
          {entry.firstName.charAt(0)}
          {entry.lastName.charAt(0)}
        </span>
      )}
      {status === 'showing' && (
        <img
          ref={image}
          src={src}
          alt={`${entry.firstName} ${entry.lastName}'s Discord avatar`}
          width={128}
          height={128}
          loading="lazy"
          decoding="async"
          onError={handleError}
        />
      )}
    </span>
  )
}
