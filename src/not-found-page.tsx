import { Link } from '@tanstack/react-router'

export function NotFoundPage({ message }: { message: string }) {
  return (
    <main>
      <p>{message}</p>
      <Link to="/">Back to the Directory</Link>
    </main>
  )
}
