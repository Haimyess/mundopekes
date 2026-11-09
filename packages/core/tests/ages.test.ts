import { describe, expect, it } from 'vitest'
import {
  childAgesSpanMonths,
  evaluateAgeFit,
  rangeIncludesChild,
  rankByAgeFit,
  type AgeRangeMonths,
} from '../src'

const TODDLERS: AgeRangeMonths = { minMonths: 12, maxMonths: 35 }
const PRESCHOOL: AgeRangeMonths = { minMonths: 36, maxMonths: 71 }
const SCHOOL: AgeRangeMonths = { minMonths: 72, maxMonths: 143 }

interface Item {
  id: string
  ranges: AgeRangeMonths[]
}

const getRanges = (item: Item) => item.ranges

describe('rangeIncludesChild', () => {
  it('matches a child whose year of age overlaps the range', () => {
    expect(rangeIncludesChild(PRESCHOOL, 3)).toBe(true)
    expect(rangeIncludesChild(PRESCHOOL, 5)).toBe(true)
    expect(rangeIncludesChild(PRESCHOOL, 6)).toBe(false)
    expect(rangeIncludesChild(TODDLERS, 1)).toBe(true)
    expect(rangeIncludesChild(TODDLERS, 0)).toBe(false)
  })
})

describe('evaluateAgeFit', () => {
  it('fits everything when no ages are given', () => {
    expect(evaluateAgeFit([], [])).toEqual({ fit: 'all', matchingAges: [] })
  })

  it('distinguishes all, some and none', () => {
    expect(evaluateAgeFit([PRESCHOOL, SCHOOL], [3, 7]).fit).toBe('all')
    expect(evaluateAgeFit([SCHOOL], [3, 7])).toEqual({ fit: 'some', matchingAges: [7] })
    expect(evaluateAgeFit([TODDLERS], [7, 9])).toEqual({ fit: 'none', matchingAges: [] })
    expect(evaluateAgeFit([], [7]).fit).toBe('none')
  })
})

describe('rankByAgeFit', () => {
  const both = (id: string): Item => ({ id, ranges: [PRESCHOOL, SCHOOL] })
  const olderOnly = (id: string): Item => ({ id, ranges: [SCHOOL] })
  const nobody: Item = { id: 'baby', ranges: [TODDLERS] }

  it('puts full matches first and completes with partial ones when there are few', () => {
    const ranked = rankByAgeFit(
      [olderOnly('p1'), both('f1'), nobody, both('f2')],
      getRanges,
      [3, 7]
    )
    expect(ranked.map(({ item }) => item.id)).toEqual(['f1', 'f2', 'p1'])
    expect(ranked[2]).toMatchObject({ fit: 'some', matchingAges: [7] })
  })

  it('drops partial matches once there are enough full ones', () => {
    const items = [olderOnly('p1'), both('f1'), both('f2'), both('f3'), both('f4')]
    expect(rankByAgeFit(items, getRanges, [3, 7]).map(({ item }) => item.id)).toEqual([
      'f1',
      'f2',
      'f3',
      'f4',
    ])
  })

  it('keeps the original order when no ages are given', () => {
    const items = [nobody, olderOnly('p1')]
    expect(rankByAgeFit(items, getRanges, []).map(({ item }) => item.id)).toEqual(['baby', 'p1'])
  })
})

describe('childAgesSpanMonths', () => {
  it('covers from the youngest to the oldest child', () => {
    expect(childAgesSpanMonths([7, 3])).toEqual({ minMonths: 36, maxMonths: 95 })
    expect(childAgesSpanMonths([])).toBeNull()
  })
})
