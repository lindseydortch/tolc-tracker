import { useRouter } from '@tanstack/react-router'
import { useRef, useState, type FormEvent } from 'react'
import type { SaveResult } from './profile'
import { refreshAfterEdit } from './refresh-after-edit'

export const couldNotSave = "Couldn't save. Try again."

export type SaveState = 'editing' | 'saving' | 'saved' | 'failed'

// State for a profile form that is checked in the browser and saved by the
// server: problems show once the Member first tries to save, then follow
// their edits. A second submit while one is saving is ignored. After a
// save, `onSaved` runs; by default the page reloads and other pages'
// cached data is dropped.
export function useSavedForm<Form, Problems extends object>({
  initial,
  problemsOf,
  save,
  onSaved,
}: {
  initial: Form
  problemsOf: (form: Form) => Problems
  save: (form: Form) => Promise<SaveResult<{ problems: Problems }>>
  onSaved?: () => Promise<unknown>
}) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [attempted, setAttempted] = useState(false)
  const [serverProblems, setServerProblems] = useState<Partial<Problems>>({})
  const [status, setStatus] = useState<SaveState>('editing')
  // Read synchronously, so two submits in one tick still send once.
  const saving = useRef(false)
  const problems: Partial<Problems> = attempted
    ? { ...serverProblems, ...problemsOf(form) }
    : {}

  const update = (changes: Partial<Form>) => {
    setForm((current) => ({ ...current, ...changes }))
    setServerProblems({})
    setStatus('editing')
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return
    setAttempted(true)
    if (Object.keys(problemsOf(form)).length > 0) return
    saving.current = true
    setStatus('saving')
    try {
      const result = await save(form)
      if (!result.ok) {
        setServerProblems(result.problems)
        setStatus('editing')
        return
      }
      setStatus('saved')
      await (onSaved ? onSaved() : refreshAfterEdit(router))
    } catch (error) {
      console.error(error)
      setStatus('failed')
    } finally {
      saving.current = false
    }
  }

  return { form, update, problems, status, onSubmit }
}

export function SaveStatus({ status }: { status: SaveState }) {
  if (status === 'saved') return <span role="status"> Saved</span>
  if (status === 'failed') return <span role="alert"> {couldNotSave}</span>
  return null
}

// For a change sent to the server straight from a button: runs one at a
// time, and shows `couldNotSave` if sending fails.
export function useServerChange() {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string>()
  const running = useRef(false)

  async function run<Result>(
    send: () => Promise<Result>,
    handle: (result: Result) => unknown,
  ) {
    if (running.current) return
    running.current = true
    setBusy(true)
    setProblem(undefined)
    try {
      await handle(await send())
    } catch (error) {
      console.error(error)
      setProblem(couldNotSave)
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  return { busy, problem, setProblem, run }
}
