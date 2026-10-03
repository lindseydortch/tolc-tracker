import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: QuickView })

function QuickView() {
  return (
    <main>
      <h1>TOLC Tracker</h1>
      <p>The Directory is coming soon.</p>
    </main>
  )
}
