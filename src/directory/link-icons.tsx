import { FileText, Globe, Link2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { GitHubMark, LinkedInMark, XMark } from '../ui/marks'
import type { LinkKind } from './directory'

const otherLinkIcon = <Link2 size={16} aria-hidden="true" />

// One icon per Link kind, shared by the badge and the profile page's Links.
// The X mark runs a size smaller to match the others' visual weight.
export const linkIcons: Record<LinkKind, ReactNode> = {
  linkedin: <LinkedInMark size={16} />,
  github: <GitHubMark size={16} />,
  resume: <FileText size={16} aria-hidden="true" />,
  portfolio: <Globe size={16} aria-hidden="true" />,
  x: <XMark size={15} />,
  bluesky: otherLinkIcon,
  custom: otherLinkIcon,
}
