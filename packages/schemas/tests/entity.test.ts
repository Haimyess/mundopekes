import { describe, expect, it } from 'vitest'
import { entityIdSchema } from '../src'

describe('entityIdSchema', () => {
  it('accepts UUIDs and rejects anything else', () => {
    expect(entityIdSchema.safeParse('7e0169f7-46f3-4659-a59a-8631148f6260').success).toBe(true)
    for (const value of ['details', '123', '', "1' or '1'='1"]) {
      expect(entityIdSchema.safeParse(value).success).toBe(false)
    }
  })
})
