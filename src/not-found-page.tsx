import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Gate } from './ui/gate'

export function NotFoundPage({ message }: { message: string }) {
  return (
    <Gate>
      <h1>{message}</h1>
      <p>The link may be old, or the page was removed. Head back to the Directory to keep looking.</p>
      <div className="gate-actions">
        <Link to="/" className="btn btn-lg">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to the Directory
        </Link>
      </div>
    </Gate>
  )
}
