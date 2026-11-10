import { describe, expect, it } from 'vitest'
import { homeContextWhen, selectHomeContext, type Occasion } from '../src'

const HANUKKAH: Occasion = { key: 'hanukkah', startsOn: '2026-12-05', endsOn: '2026-12-12' }

describe('selectHomeContext', () => {
  it('shows an occasion that is running or starts within a week', () => {
    expect(selectHomeContext('2026-12-08', [HANUKKAH])).toEqual({
      kind: 'occasion',
      occasion: HANUKKAH,
    })
    expect(selectHomeContext('2026-11-29', [HANUKKAH])).toMatchObject({ kind: 'occasion' })
  })

  it('shows Shabbat from Thursday to Saturday and today otherwise', () => {
    expect(selectHomeContext('2026-11-12', [HANUKKAH])).toEqual({ kind: 'shabat' })
    expect(selectHomeContext('2026-11-14', [])).toEqual({ kind: 'shabat' })
    expect(selectHomeContext('2026-11-15', [])).toEqual({ kind: 'today' })
    expect(selectHomeContext('2026-11-18', [HANUKKAH])).toEqual({ kind: 'today' })
  })
})

describe('homeContextWhen', () => {
  it('turns the context into a search date', () => {
    expect(homeContextWhen({ kind: 'occasion', occasion: HANUKKAH })).toEqual({
      kind: 'occasion',
      key: 'hanukkah',
    })
    expect(homeContextWhen({ kind: 'shabat' })).toEqual({ kind: 'shortcut', shortcut: 'shabat' })
    expect(homeContextWhen({ kind: 'today' })).toEqual({ kind: 'shortcut', shortcut: 'today' })
  })
})
