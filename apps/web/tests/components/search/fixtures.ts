import type { SearchResultItem } from '#shared/types/search'

export function makeResultItem(overrides: Partial<SearchResultItem> = {}): SearchResultItem {
  return {
    kind: 'activity',
    id: 'activity-1',
    title: { es: 'Taller de cerámica' },
    placeName: { es: 'Casa del Arte' },
    imageUrl: 'https://example.com/ceramica.jpg',
    cityName: 'Jaffa',
    isFree: false,
    price: 70,
    ageSpan: { min: 5, max: 12 },
    activityCount: null,
    fit: 'all',
    matchingAges: [],
    ...overrides,
  }
}
