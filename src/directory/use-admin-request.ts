import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { SaveResult } from './profile'

export type AdminRequestResult = SaveResult<{ problem: string }>

// Sends the Admin page's requests one at a time. `status` says how the last
// one went; the page's data reloads after each.
export function useAdminRequest() {
  const router = useRouter()
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
      await router.invalidate()
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
