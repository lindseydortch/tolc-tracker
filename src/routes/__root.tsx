import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { NotFoundPage } from '../not-found-page'
import { NavigationProgress } from '../ui/navigation-progress'
import appCss from '../styles.css?url'

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
      {
        name: 'theme-color',
        content: '#110f15',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => <NotFoundPage message="Page not found." />,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <NavigationProgress />
        {children}

        <Scripts />
      </body>
    </html>
  )
}
