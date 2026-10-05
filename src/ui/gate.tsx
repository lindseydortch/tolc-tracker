import { Lanyard } from './lanyard'
import type { ReactNode } from 'react'

// The pages before the Directory: a blank badge hanging from a TOLC lanyard.
export function Gate({ children }: { children: ReactNode }) {
  return (
    <main className="gate">
      <div className="gate-stack">
        <Lanyard />
        <div className="badge">
          <div className="gate-body">{children}</div>
        </div>
      </div>
    </main>
  )
}
