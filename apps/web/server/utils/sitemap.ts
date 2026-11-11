export interface SitemapEntry {
  path: string
  lastModified?: string | null
}

export interface SitemapOptions {
  baseUrl: string
  locales: readonly string[]
  defaultLocale: string
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

export const STATIC_SITEMAP_PATHS = ['/', '/search', '/business', '/about', '/terms', '/privacy']

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character]!)
}

export function localizedPath(path: string, locale: string, defaultLocale: string): string {
  if (locale === defaultLocale) return path
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}

function toDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

function urlBlock(entry: SitemapEntry, locale: string, options: SitemapOptions): string {
  const origin = options.baseUrl.replace(/\/$/, '')
  const href = (code: string) =>
    escapeXml(`${origin}${localizedPath(entry.path, code, options.defaultLocale)}`)
  const alternates = [
    ...options.locales.map(
      (code) => `<xhtml:link rel="alternate" hreflang="${code}" href="${href(code)}"/>`
    ),
    `<xhtml:link rel="alternate" hreflang="x-default" href="${href(options.defaultLocale)}"/>`,
  ]
  const lastModified = toDate(entry.lastModified)
  return [
    '<url>',
    `<loc>${href(locale)}</loc>`,
    ...(lastModified ? [`<lastmod>${lastModified}</lastmod>`] : []),
    ...alternates,
    '</url>',
  ].join('')
}

export function buildSitemapXml(entries: readonly SitemapEntry[], options: SitemapOptions): string {
  const urls = entries.flatMap((entry) =>
    options.locales.map((locale) => urlBlock(entry, locale, options))
  )
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
  ].join('\n')
}

export function buildRobotsTxt(baseUrl: string): string {
  if (!baseUrl) return ['User-agent: *', 'Disallow: /', ''].join('\n')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml`,
    '',
  ].join('\n')
}
