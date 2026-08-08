import { cleanHtml } from '../utils/html-cleaner.js'

const FETCH_TIMEOUT_MS = 8000

export async function scrapeWebsite(url: string | null): Promise<string | null> {
  if (!url) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MundoPekes-CatalogBot/1.0' },
    })

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return null

    const html = await res.text()
    return cleanHtml(html)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

const PRICE_PATTERNS = [
  /₪/,
  /\bNIS\b/i,
  /\bILS\b/i,
  /מחיר/,
  /כניסה/,
  /תשלום/,
  /כרטיס/,
  /\bprice\b/i,
  /\bentry fee\b/i,
  /\badmission\b/i,
  /\bticket\b/i,
  /\bprecio\b/i,
  /\bentrada\b/i,
  /\btarifa\b/i,
]

export function detectsPricingInText(text: string): boolean {
  return PRICE_PATTERNS.some((pattern) => pattern.test(text))
}
