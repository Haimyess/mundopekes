const SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl'])
const GOOGLE_MAPS_HOST_PATTERN = /(?:^|\.)google\.[a-z.]+$/
const RESOLVE_TIMEOUT_MS = 3000
const PLACE_ID_PATTERNS = [/[?&]query_place_id=([\w-]{10,})/, /place_id:([\w-]{10,})/]

function parseUrl(link: string): URL | null {
  try {
    return new URL(link)
  } catch {
    return null
  }
}

export function extractGooglePlaceId(link: string): string | null {
  const url = parseUrl(link)
  if (!url || !GOOGLE_MAPS_HOST_PATTERN.test(url.hostname)) return null
  const decoded = decodeURIComponent(url.href)
  for (const pattern of PLACE_ID_PATTERNS) {
    const match = pattern.exec(decoded)
    if (match?.[1]) return match[1]
  }
  return null
}

export async function resolveGooglePlaceId(link: string | undefined): Promise<string | null> {
  if (!link) return null
  const direct = extractGooglePlaceId(link)
  if (direct) return direct
  const url = parseUrl(link)
  if (!url || url.protocol !== 'https:' || !SHORT_LINK_HOSTS.has(url.hostname)) return null
  try {
    const response = await $fetch.raw(url.href, {
      method: 'HEAD',
      redirect: 'manual',
      timeout: RESOLVE_TIMEOUT_MS,
      ignoreResponseError: true,
    })
    const location = response.headers.get('location')
    return location ? extractGooglePlaceId(location) : null
  } catch {
    return null
  }
}
