export interface AgeRangeMonths {
  minMonths: number
  maxMonths: number
}

export type AgeFit = 'all' | 'some' | 'none'

export interface AgeFitResult {
  fit: AgeFit
  matchingAges: number[]
}

export interface RankedByAge<T> {
  item: T
  fit: Exclude<AgeFit, 'none'>
  matchingAges: number[]
}

export const CHILD_AGE_LIMITS = {
  minYears: 0,
  maxYears: 17,
  maxChildren: 6,
} as const

export const AGE_FIT_MIN_FULL_MATCHES = 4

const MONTHS_PER_YEAR = 12

function childWindow(years: number): AgeRangeMonths {
  const minMonths = years * MONTHS_PER_YEAR
  return { minMonths, maxMonths: minMonths + MONTHS_PER_YEAR - 1 }
}

export function rangeIncludesChild(range: AgeRangeMonths, years: number): boolean {
  const child = childWindow(years)
  return range.minMonths <= child.maxMonths && range.maxMonths >= child.minMonths
}

export function evaluateAgeFit(
  ranges: readonly AgeRangeMonths[],
  childAges: readonly number[]
): AgeFitResult {
  if (childAges.length === 0) return { fit: 'all', matchingAges: [] }
  const matchingAges = childAges.filter((years) =>
    ranges.some((range) => rangeIncludesChild(range, years))
  )
  if (matchingAges.length === 0) return { fit: 'none', matchingAges }
  return { fit: matchingAges.length === childAges.length ? 'all' : 'some', matchingAges }
}

export function rankByAgeFit<T>(
  items: readonly T[],
  getRanges: (item: T) => readonly AgeRangeMonths[],
  childAges: readonly number[],
  minFullMatches: number = AGE_FIT_MIN_FULL_MATCHES
): RankedByAge<T>[] {
  const full: RankedByAge<T>[] = []
  const partial: RankedByAge<T>[] = []
  for (const item of items) {
    const { fit, matchingAges } = evaluateAgeFit(getRanges(item), childAges)
    if (fit === 'all') full.push({ item, fit, matchingAges })
    else if (fit === 'some') partial.push({ item, fit, matchingAges })
  }
  return full.length >= minFullMatches ? full : [...full, ...partial]
}

export function childAgesSpanMonths(childAges: readonly number[]): AgeRangeMonths | null {
  if (childAges.length === 0) return null
  const youngest = childWindow(Math.min(...childAges))
  const oldest = childWindow(Math.max(...childAges))
  return { minMonths: youngest.minMonths, maxMonths: oldest.maxMonths }
}
