// Link rules shared by the browser and the server. Imports no database
// code, so routes can use it client-side.
import type { LinkKind } from './directory'
import { toUrl } from './to-url'

// The optional Links other than Custom Links, one of each per Member.
// Adding a kind here also needs it in the `link_kind` enum.
export const optionalLinks = [
  {
    kind: 'resume',
    name: 'Resume',
    label: 'Resume URL',
    placeholder: 'https://example.com/resume.pdf',
    problem: 'Enter your resume as a URL',
  },
  {
    kind: 'portfolio',
    name: 'Portfolio',
    label: 'Portfolio URL',
    placeholder: 'https://example.com',
    problem: 'Enter your portfolio as a URL',
  },
  {
    kind: 'x',
    name: 'X',
    label: 'X profile URL',
    placeholder: 'https://x.com/you',
    problem: 'Enter your X profile as a URL',
  },
  {
    kind: 'bluesky',
    name: 'Bluesky',
    label: 'Bluesky profile URL',
    placeholder: 'https://bsky.app/profile/you',
    problem: 'Enter your Bluesky profile as a URL',
  },
] as const

export type OptionalLinkKind = (typeof optionalLinks)[number]['kind']

// Custom Links show their own label instead.
export const linkKindLabels: Record<LinkKind, string> = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  ...optionalLinkValues(({ name }) => name),
  custom: 'Custom',
}

// The optional Links. A blank URL means the Member has no such Link.
export type LinksForm = Record<OptionalLinkKind, string> & {
  custom: CustomLinkForm[]
}

export type CustomLinkForm = { label: string; url: string }

// A LinksForm whose optional Links take their URLs from `urlOf`.
export function linksFrom(
  urlOf: (kind: OptionalLinkKind) => string,
  custom: CustomLinkForm[],
): LinksForm {
  return { ...optionalLinkValues(({ kind }) => urlOf(kind)), custom }
}

// A LinksForm with every optional Link blank and no Custom Links.
export function emptyLinks(): LinksForm {
  return linksFrom(() => '', [])
}

// One value per optional Link kind. The cast is safe because `optionalLinks`
// lists every OptionalLinkKind, and TypeScript can't see that through
// Object.fromEntries.
function optionalLinkValues(
  valueOf: (link: (typeof optionalLinks)[number]) => string,
): Record<OptionalLinkKind, string> {
  return Object.fromEntries(
    optionalLinks.map((link) => [link.kind, valueOf(link)]),
  ) as Record<OptionalLinkKind, string>
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
  for (const { kind, problem } of optionalLinks) {
    if (form[kind].trim() && !toUrl(form[kind])) problems[kind] = problem
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

  if (Object.keys(problems).length > 0) return { ok: false, problems }
  return {
    ok: true,
    links: linksFrom(
      (kind) => toUrl(form[kind]) ?? '',
      custom.map(({ label, url }) => ({ label, url: url ?? '' })),
    ),
  }
}

export function linksProblems(form: LinksForm): LinksProblems {
  const check = checkLinks(form)
  return check.ok ? {} : check.problems
}

