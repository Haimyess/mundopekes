// Only allows http(s) URLs — rejects javascript:/data:/etc. URIs that would
// otherwise render as a clickable link and execute in the visitor's origin.
export function sanitizeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return value
  } catch {
    return null
  }
}
