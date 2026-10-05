// Link rules shared by the browser and the server. Imports no database
// code, so routes can use it client-side.
import type { LinkKind } from './directory'

// Custom Links show their own label instead.
export const linkKindLabels: Record<LinkKind, string> = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  resume: 'Resume',
  portfolio: 'Portfolio',
  x: 'X',
  bluesky: 'Bluesky',
  custom: 'Custom',
}

// The optional Links other than Custom Links, one of each per Member.
// Adding a kind here also needs it in the `link_kind` enum.
export const optionalLinks = [
  {
    kind: 'resume',
    label: 'Resume URL',
    placeholder: 'https://example.com/resume.pdf',
    problem: 'Enter your resume as a URL',
  },
  {
    kind: 'portfolio',
    label: 'Portfolio URL',
    placeholder: 'https://example.com',
    problem: 'Enter your portfolio as a URL',
  },
  {
    kind: 'x',
    label: 'X profile URL',
    placeholder: 'https://x.com/you',
    problem: 'Enter your X profile as a URL',
  },
  {
    kind: 'bluesky',
    label: 'Bluesky profile URL',
    placeholder: 'https://bsky.app/profile/you',
    problem: 'Enter your Bluesky profile as a URL',
  },
] as const

export type OptionalLinkKind = (typeof optionalLinks)[number]['kind']

// The optional Links. A blank URL means the Member has no such Link.
export type LinksForm = Record<OptionalLinkKind, string> & {
  custom: CustomLinkForm[]
}

export type CustomLinkForm = { label: string; url: string }

// A LinksForm with every optional Link blank and no Custom Links.
export function emptyLinks(): LinksForm {
  const links = { custom: [] } as unknown as LinksForm
  for (const { kind } of optionalLinks) links[kind] = ''
  return links
}

export type LinksProblems = Partial<
  Record<OptionalLinkKind, string> & {
    // One entry per Custom Link, undefined where it is fine.
    custom: (string | undefined)[]
  }
>

export type LinksCheck =
  | { ok: true; links: LinksForm }
  | { ok: false; problems: LinksProblems }

export function checkLinks(form: LinksForm): LinksCheck {
  const problems: LinksProblems = {}
  const links = emptyLinks()
  for (const { kind, problem } of optionalLinks) {
    if (!form[kind].trim()) continue
    const url = toUrl(form[kind])
    if (url) links[kind] = url
    else problems[kind] = problem
  }

  const custom = form.custom.map((link) => ({
    label: link.label.trim(),
    url: toUrl(link.url),
  }))
  const customProblems = custom.map((link) => {
    if (!link.label) return 'Enter a label'
    if (!link.url) return 'Enter a URL'
    return undefined
  })
  if (customProblems.some(Boolean)) problems.custom = customProblems
  links.custom = custom.map(({ label, url }) => ({ label, url: url ?? '' }))

  if (Object.keys(problems).length > 0) return { ok: false, problems }
  return { ok: true, links }
}

export function linksProblems(form: LinksForm): LinksProblems {
  const check = checkLinks(form)
  return check.ok ? {} : check.problems
}

// Accepts an http(s) URL, with or without "https://", on `site` or its
// subdomains if given.
export function toUrl(typed: string, site?: string): string | null {
  const trimmed = typed.trim()
  if (!trimmed) return null
  let url: URL
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.toLowerCase()
  if (!host.includes('.')) return null
  if (site && host !== site && !host.endsWith(`.${site}`)) return null
  return url.toString()
}
