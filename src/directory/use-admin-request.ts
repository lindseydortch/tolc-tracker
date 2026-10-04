import { useState } from 'react'
import type { SaveResult } from './profile'
import { useReloadAfterChange } from './reload-after-change'

export type AdminRequestResult = SaveResult<{ problem: string }>

// Sends the Admin page's requests one at a time. `status` says how the last
// one went; after each, it calls `reloadAfterChange`.
export function useAdminRequest() {
  const reload = useReloadAfterChange()
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // True if the request went through.
  async function send(
    request: () => Promise<AdminRequestResult>,
    messages: { done: string; failed: string },
  ): Promise<boolean> {
    setBusy(true)
    try {
      const result = await request()
      setStatus(result.ok ? messages.done : result.problem)
      await reload()
      return result.ok
    } catch {
      setStatus(messages.failed)
      return false
    } finally {
      setBusy(false)
    }
  }

  return { status, busy, send }
}
