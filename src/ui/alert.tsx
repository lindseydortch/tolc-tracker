import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

// A problem the visitor needs to act on.
export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="banner">
      <CircleAlert size={16} aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
