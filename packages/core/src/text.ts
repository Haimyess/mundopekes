const COMBINING_MARKS = /\p{M}/gu
const PUNCTUATION = /[^\p{L}\p{N}]+/gu

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(PUNCTUATION, ' ')
    .trim()
}

export function matchesSearchText(haystack: string, query: string): boolean {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean)
  if (terms.length === 0) return true
  const normalizedHaystack = normalizeSearchText(haystack)
  return terms.every((term) => normalizedHaystack.includes(term))
}
