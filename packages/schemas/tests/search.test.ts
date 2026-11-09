import { describe, expect, it } from 'vitest'
import { childAgesQuerySchema, childAgesSchema, VALIDATION_ERRORS, whenQuerySchema } from '../src'

describe('childAgesQuerySchema', () => {
  it('parses a comma separated list of ages', () => {
    expect(childAgesQuerySchema.parse('3,7')).toEqual([3, 7])
    expect(childAgesQuerySchema.parse(' ')).toEqual([])
  })

  it.each(['3,abc', '3,18', '-1', '2.5', '1,2,3,4,5,6,7'])('rejects %j', (value) => {
    expect(childAgesQuerySchema.safeParse(value).success).toBe(false)
  })

  it('reports translatable errors', () => {
    const result = childAgesSchema.safeParse([20])
    expect(result.error?.issues[0]?.message).toBe(VALIDATION_ERRORS.invalidNumber)
  })
})

describe('whenQuerySchema', () => {
  it('turns the query value into a structured when', () => {
    expect(whenQuerySchema.parse('this-weekend')).toEqual({
      kind: 'shortcut',
      shortcut: 'this-weekend',
    })
    expect(whenQuerySchema.parse('occasion:pesach')).toEqual({ kind: 'occasion', key: 'pesach' })
  })

  it('rejects unknown values with a translatable error', () => {
    const result = whenQuerySchema.safeParse('next-year')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(VALIDATION_ERRORS.invalidOption)
  })
})
