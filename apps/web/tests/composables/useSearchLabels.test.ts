import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'en' },
    t: (key: string, params?: unknown) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}))
vi.mock('~/app/composables/useI18nContent', () => ({
  useI18nContent: () => ({ tc: (text: Record<string, string>) => text.en ?? '' }),
}))

const { useSearchLabels } = await import('~/app/composables/useSearchLabels')
const HANUKKAH = {
  key: 'hanukkah',
  name: { en: 'Hanukkah' },
  startsOn: '2026-12-05',
  endsOn: '2026-12-12',
}

describe('useSearchLabels', () => {
  const { whenLabel, agesLabel, activeFilterCount } = useSearchLabels()

  it('describes every kind of date', () => {
    expect(whenLabel(undefined, null)).toBeUndefined()
    expect(whenLabel({ kind: 'shortcut', shortcut: 'today' }, null)).toBe('results.when.today')
    expect(whenLabel({ kind: 'occasion', key: 'hanukkah' }, HANUKKAH)).toBe('Hanukkah')
    expect(whenLabel({ kind: 'occasion', key: 'pesach' }, HANUKKAH)).toBe('results.when.occasion')
    expect(
      whenLabel({ kind: 'fixed', range: { from: '2026-12-01', to: '2026-12-01' } }, null)
    ).toBe('Tue, Dec 1')
    expect(
      whenLabel({ kind: 'fixed', range: { from: '2026-12-01', to: '2026-12-03' } }, null)
    ).toBe('Tue, Dec 1 – Thu, Dec 3')
  })

  it('lists the ages as a natural sentence', () => {
    expect(agesLabel([])).toBeUndefined()
    expect(agesLabel([3, 7, 9])).toBe('results.who.value:{"ages":"3, 7, and 9"}')
  })

  it('counts each active filter and amenity', () => {
    expect(activeFilterCount({})).toBe(0)
    expect(
      activeFilterCount({
        kind: 'place',
        free: true,
        open: 'now',
        amenities: ['shade', 'stroller'],
      })
    ).toBe(5)
  })
})
