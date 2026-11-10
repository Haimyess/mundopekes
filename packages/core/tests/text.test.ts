import { describe, expect, it } from 'vitest'
import { matchesSearchText, normalizeSearchText } from '../src'

describe('normalizeSearchText', () => {
  it('removes accents, Hebrew points and punctuation', () => {
    expect(normalizeSearchText('Café-Museo ¡Niños!')).toBe('cafe museo ninos')
    expect(normalizeSearchText('שָׁלוֹם')).toBe('שלום')
  })
})

describe('matchesSearchText', () => {
  it('requires every term in any order', () => {
    expect(matchesSearchText('Museo del Juguete Jaffa', 'jaffa museo')).toBe(true)
    expect(matchesSearchText('Museo del Juguete Jaffa', 'museo haifa')).toBe(false)
  })

  it('matches everything for an empty query', () => {
    expect(matchesSearchText('anything', '  ')).toBe(true)
  })

  it('matches Hebrew and Russian text', () => {
    expect(matchesSearchText('חוף רמבם Пляж', 'חוף')).toBe(true)
    expect(matchesSearchText('חוף רמבם Пляж', 'пляж')).toBe(true)
  })
})
