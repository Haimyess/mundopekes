export const QUICK_SUGGESTION_SOURCE = 'quick'

export const QUICK_SUGGESTION_FIELDS = ['location', 'category', 'ages', 'hours', 'title'] as const

export type QuickSuggestionField = (typeof QUICK_SUGGESTION_FIELDS)[number]

export interface QuickSuggestionInput {
  category_id?: string | null
  schedule?: string | null
  age_range?: unknown
  location?: unknown
  metadata?: Record<string, unknown> | null
}

export interface QuickSuggestionDetails {
  where: string | null
  link: string | null
  why: string | null
  origin: string | null
  locale: string | null
}

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:'])

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function hasEntries(value: unknown): boolean {
  return (
    typeof value === 'object' && value !== null && Object.values(value).some((entry) => text(entry))
  )
}

export function isQuickSuggestion(suggestion: Pick<QuickSuggestionInput, 'metadata'>): boolean {
  return suggestion.metadata?.source === QUICK_SUGGESTION_SOURCE
}

export function safeExternalLink(value: unknown): string | null {
  const raw = text(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

export function quickSuggestionDetails(
  suggestion: Pick<QuickSuggestionInput, 'metadata'>
): QuickSuggestionDetails {
  const metadata = suggestion.metadata ?? {}
  return {
    where: text(metadata.where),
    link: safeExternalLink(metadata.link),
    why: text(metadata.why),
    origin: text(metadata.origin),
    locale: text(metadata.locale),
  }
}

export function googleMapsSearchUrl(name: string, where: string | null): string {
  const query = [name, where].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function missingQuickSuggestionFields(
  suggestion: QuickSuggestionInput
): QuickSuggestionField[] {
  const metadata = suggestion.metadata ?? {}
  const location = (suggestion.location ?? {}) as {
    lat?: unknown
    lng?: unknown
    address?: unknown
  }
  const openingHours = Array.isArray(metadata.opening_hours_text) ? metadata.opening_hours_text : []
  const ageIds = (suggestion.age_range as { ids?: unknown[] } | null)?.ids ?? []
  const checks: Record<QuickSuggestionField, boolean> = {
    location:
      (typeof location.lat === 'number' && typeof location.lng === 'number') ||
      !!text(location.address),
    category: !!suggestion.category_id,
    ages: ageIds.length > 0,
    hours:
      metadata.hours_unknown === true || !!text(suggestion.schedule) || openingHours.length > 0,
    title: hasEntries(metadata.title_i18n),
  }
  return QUICK_SUGGESTION_FIELDS.filter((field) => !checks[field])
}
