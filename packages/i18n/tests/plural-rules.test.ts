import { describe, expect, it } from 'vitest'
import { PLURAL_RULES, russianPluralRule } from '../src'

describe('russianPluralRule', () => {
  it.each([
    [0, 0],
    [1, 1],
    [21, 1],
    [2, 2],
    [4, 2],
    [23, 2],
    [5, 3],
    [11, 3],
    [12, 3],
    [14, 3],
    [111, 3],
    [25, 3],
  ])('picks form %i → %i with zero, one, few and many', (choice, expected) => {
    expect(russianPluralRule(choice, 4)).toBe(expected)
  })

  it('falls back to the last form when only three are given', () => {
    expect(russianPluralRule(5, 3)).toBe(2)
  })

  it('is registered for Russian only', () => {
    expect(Object.keys(PLURAL_RULES)).toEqual(['ru'])
  })
})
