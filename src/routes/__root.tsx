import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TOLC Tracker',
      },
    ],
  }),
  shellComponent: RootDocument,
  // Unknown URLs. Routes with their own not-found page (a Member profile)
  // keep theirs.
  notFoundComponent: () => (
    <main>
      <p>Page not found</p>
      <Link to="/">Back to the Directory</Link>
    </main>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}

        <Scripts />
      </body>
    </html>
  )
}
