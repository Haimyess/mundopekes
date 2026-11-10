import type { IsoDate } from '@mundopekes/core'
import type { SearchOccasion, SearchResultItem } from './search'

export interface HomeSection {
  items: SearchResultItem[]
  total: number
  query: Record<string, string>
}

export type HomeContextSection = HomeSection &
  ({ kind: 'occasion'; occasion: SearchOccasion } | { kind: 'shabat' } | { kind: 'today' })

export interface HomeCategorySection extends HomeSection {
  slug: string
}

export interface HomeResponse {
  today: IsoDate
  occasion: SearchOccasion | null
  context: HomeContextSection | null
  free: HomeSection | null
  categories: HomeCategorySection[]
  categoryCounts: Record<string, number>
}
