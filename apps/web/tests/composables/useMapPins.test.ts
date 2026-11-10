import { describe, expect, it, vi } from 'vitest'
import { makeResultItem } from '../components/search/fixtures'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: { value: 'en' }, t: (key: string) => key }),
}))
vi.mock('~/app/composables/useI18nContent', () => ({
  useI18nContent: () => ({ tc: (text: Record<string, string>) => text.es ?? '' }),
}))

const { useMapPins } = await import('~/app/composables/useMapPins')

describe('useMapPins', () => {
  it('labels pins with the price, free or the kind and keeps the title', () => {
    const location = { lat: 32, lng: 34.8 }
    const pins = useMapPins().toMapPins([
      { ...makeResultItem({ id: 'a', price: 35 }), location },
      { ...makeResultItem({ id: 'b', isFree: true }), location },
      { ...makeResultItem({ id: 'c', kind: 'place', price: null }), location },
    ])
    expect(pins.map(({ id, label, title }) => [id, label, title])).toEqual([
      ['a', '₪35', 'Taller de cerámica'],
      ['b', 'results.free', 'Taller de cerámica'],
      ['c', 'results.kind.place', 'Taller de cerámica'],
    ])
  })
})
