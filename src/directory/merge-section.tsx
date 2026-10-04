import { useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import type { MergeResult } from './catalog-merge'
import type { MergeForm } from './merge-form'

// One Catalog's merge form on the Admin page.
export function MergeSection({
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
      <h3>Merge {kind}s</h3>
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
