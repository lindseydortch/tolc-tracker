import { CircleAlert } from 'lucide-react'

// What blocks a form field, shown under it.
export function Problem({ text }: { text?: string }) {
  if (!text) return null
  return (
    <span role="alert" className="problem">
      <CircleAlert size={14} aria-hidden="true" />
      {text}
    </span>
  )
}
