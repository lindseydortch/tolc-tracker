import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState, type FormEvent } from 'react'
import type { MergeResult } from '../../directory/catalog-merge'
import type { MergeForm } from '../../directory/merge-form'
import {
  getMergeCatalogs,
  mergeSkills,
  mergeTargetRoles,
} from '../../directory/catalog-merge-fns'
import { NotFoundPage } from '../../not-found-page'

// The Admin merges duplicate Skills and Target Roles here. Everyone else
// gets the not-found page.
export const Route = createFileRoute('/_member/merge')({
  loader: () => getMergeCatalogs(),
  component: MergePage,
  notFoundComponent: () => <NotFoundPage message="Nothing here." />,
})

function MergePage() {
  const catalogs = Route.useLoaderData()
  const mergeSkill = useServerFn(mergeSkills)
  const mergeRole = useServerFn(mergeTargetRoles)

  return (
    <main>
      <p>
        <Link to="/">Back to the Directory</Link>
      </p>
      <h1>Merge Skills and Target Roles</h1>
      <p>
        Merging A into B makes A's name and Aliases into Aliases of B, moves
        every Member using A onto B, then removes A. It can't be undone.
      </p>
      <MergeSection
        kind="Skill"
        listId="skill-catalog"
        entries={catalogs.skills}
        merge={(form) => mergeSkill({ data: form })}
      />
      <MergeSection
        kind="Target Role"
        listId="role-catalog"
        entries={catalogs.roles}
        merge={(form) => mergeRole({ data: form })}
      />
    </main>
  )
}

function MergeSection({
  kind,
  listId,
  entries,
  merge,
}: {
  kind: 'Skill' | 'Target Role'
  // The id of this section's autocomplete list.
  listId: string
  entries: { name: string; aliases: string[] }[]
  merge: (form: MergeForm) => Promise<MergeResult>
}) {
  const router = useRouter()
  const [form, setForm] = useState<MergeForm>({ from: '', into: '' })
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!window.confirm(`Merge "${form.from}" into "${form.into}"? This can't be undone.`)) {
      return
    }
    setSaving(true)
    try {
      const result = await merge(form)
      if (result.ok) {
        setStatus(`Merged "${form.from}" into "${form.into}".`)
        setForm({ from: '', into: '' })
        await router.invalidate()
      } else {
        setStatus(result.problem)
      }
    } catch {
      setStatus('Could not merge. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2>Merge {kind}s</h2>
      <datalist id={listId}>
        {entries.map((entry) => (
          <option key={entry.name} value={entry.name}>
            {entry.aliases.join(', ')}
          </option>
        ))}
      </datalist>
      <form onSubmit={onSubmit}>
        <p>
          <label>
            Merge {kind}{' '}
            <input
              list={listId}
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
              required
            />
          </label>{' '}
          <label>
            into{' '}
            <input
              list={listId}
              value={form.into}
              onChange={(e) => setForm({ ...form, into: e.target.value })}
              required
            />
          </label>{' '}
          <button type="submit" disabled={saving}>
            Merge
          </button>
        </p>
        {status && <p role="status">{status}</p>}
      </form>
    </section>
  )
}
