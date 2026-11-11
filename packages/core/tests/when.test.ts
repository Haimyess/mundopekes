import { describe, expect, it } from 'vitest'
import {
  isEvergreenWhen,
  parseWhen,
  resolveWhen,
  serializeWhen,
  type Occasion,
  type When,
} from '../src'

const OCCASIONS: Occasion[] = [{ key: 'hanukkah', startsOn: '2026-12-05', endsOn: '2026-12-12' }]
const MONDAY = '2026-11-09'
const FRIDAY = '2026-11-13'
const SATURDAY = '2026-11-14'

function resolve(raw: string, today: string = MONDAY) {
  const when = parseWhen(raw)
  return when ? resolveWhen(when, { today, occasions: OCCASIONS }) : undefined
}

describe('parseWhen', () => {
  it.each([
    ['today', { kind: 'shortcut', shortcut: 'today' }],
    ['this-weekend', { kind: 'shortcut', shortcut: 'this-weekend' }],
    ['occasion:hanukkah', { kind: 'occasion', key: 'hanukkah' }],
    ['fixed:2026-12-01', { kind: 'fixed', range: { from: '2026-12-01', to: '2026-12-01' } }],
    [
      'fixed:2026-12-01/2026-12-03',
      { kind: 'fixed', range: { from: '2026-12-01', to: '2026-12-03' } },
    ],
  ])('parses %s', (raw, expected) => {
    expect(parseWhen(raw)).toEqual(expected)
  })

  it.each([
    '',
    'yesterday',
    'occasion:',
    'occasion:Hanukkah',
    'occasion:../x',
    'fixed:2026-02-30',
    'fixed:2026-12-03/2026-12-01',
    'fixed:2026-12-01/2027-01-15',
    'fixed:2026-12-01/2026-12-02/2026-12-03',
  ])('rejects %j', (raw) => {
    expect(parseWhen(raw)).toBeNull()
  })

  it('round-trips through serializeWhen', () => {
    const values = [
      'shabat',
      'occasion:hanukkah',
      'fixed:2026-12-01',
      'fixed:2026-12-01/2026-12-04',
    ]
    for (const value of values) expect(serializeWhen(parseWhen(value) as When)).toBe(value)
  })
})

describe('resolveWhen', () => {
  it('resolves today and tomorrow', () => {
    expect(resolve('today')).toEqual({ from: MONDAY, to: MONDAY })
    expect(resolve('tomorrow')).toEqual({ from: '2026-11-10', to: '2026-11-10' })
  })

  it('resolves this weekend to friday and saturday', () => {
    expect(resolve('this-weekend')).toEqual({ from: FRIDAY, to: SATURDAY })
    expect(resolve('this-weekend', FRIDAY)).toEqual({ from: FRIDAY, to: SATURDAY })
    expect(resolve('this-weekend', SATURDAY)).toEqual({ from: SATURDAY, to: SATURDAY })
    expect(resolve('this-weekend', '2026-11-15')).toEqual({ from: '2026-11-20', to: '2026-11-21' })
  })

  it('resolves shabat to the coming saturday', () => {
    expect(resolve('shabat')).toEqual({ from: SATURDAY, to: SATURDAY })
    expect(resolve('shabat', SATURDAY)).toEqual({ from: SATURDAY, to: SATURDAY })
  })

  it('resolves occasions from the table and returns null when none is left', () => {
    expect(resolve('occasion:hanukkah')).toEqual({ from: '2026-12-05', to: '2026-12-12' })
    expect(resolve('occasion:hanukkah', '2026-12-20')).toBeNull()
  })

  it('keeps fixed ranges as they are', () => {
    expect(resolve('fixed:2026-12-01/2026-12-03')).toEqual({ from: '2026-12-01', to: '2026-12-03' })
  })
})

describe('isEvergreenWhen', () => {
  it('treats weekend, Shabat and occasions as stable over time', () => {
    expect(isEvergreenWhen({ kind: 'shortcut', shortcut: 'this-weekend' })).toBe(true)
    expect(isEvergreenWhen({ kind: 'shortcut', shortcut: 'shabat' })).toBe(true)
    expect(isEvergreenWhen({ kind: 'occasion', key: 'hanukkah' })).toBe(true)
  })

  it('treats relative days and fixed dates as short lived', () => {
    expect(isEvergreenWhen({ kind: 'shortcut', shortcut: 'today' })).toBe(false)
    expect(isEvergreenWhen({ kind: 'shortcut', shortcut: 'tomorrow' })).toBe(false)
    expect(
      isEvergreenWhen({ kind: 'fixed', range: { from: '2026-12-01', to: '2026-12-02' } })
    ).toBe(false)
  })
})
