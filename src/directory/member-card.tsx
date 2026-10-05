import type { ReactNode } from 'react'
import { DiscordMark } from '../ui/marks'
import type { DirectoryEntry } from './directory'
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
          <Title className="badge-name">
            <span className="badge-first">{entry.firstName}</span>{' '}
            <span className="badge-last">{entry.lastName}</span>
          </Title>
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
