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
