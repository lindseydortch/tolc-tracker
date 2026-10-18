import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import type { RouterContext } from '../router-context'
import { NotFoundPage } from '../not-found-page'
import { NavigationProgress } from '../ui/navigation-progress'
import appCss from '../styles.css?url'

const description =
  'The members-only referral Directory of TOLC, the Offer Letter Club.'
// Netlify exposes the production site URL as `URL` at build time; fall back to
// a relative path in dev so previews still resolve on a local server.
const siteUrl = typeof process !== 'undefined' ? (process.env.URL ?? '') : ''
const siteOrigin = siteUrl.replace(/\/+$/, '')

export const Route = createRootRouteWithContext<RouterContext>()({
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
        name: 'description',
        content: description,
      },
      {
        name: 'theme-color',
        content: '#110f15',
      },
      {
        property: 'og:title',
        content: 'TOLC Tracker',
      },
      {
        property: 'og:description',
        content: description,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site_name',
        content: 'TOLC Tracker',
      },
      {
        property: 'og:url',
        content: `${siteOrigin}/`,
      },
      {
        property: 'og:image',
        content: `${siteOrigin}/og-image.png`,
      },
      {
        property: 'og:image:width',
        content: '1200',
      },
      {
        property: 'og:image:height',
        content: '630',
      },
      {
        property: 'og:image:alt',
        content: description,
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'TOLC Tracker',
      },
      {
        name: 'twitter:description',
        content: description,
      },
      {
        name: 'twitter:image',
        content: `${siteOrigin}/og-image.png`,
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'icon',
        href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💌</text></svg>`,
      },
    ],
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
