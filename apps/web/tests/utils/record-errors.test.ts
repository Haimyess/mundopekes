import { describe, expect, it } from 'vitest'
import { getRecordError, isNotFoundError } from '~/app/utils/record-errors'

describe('isNotFoundError', () => {
  it.each(['PGRST116', '22P02'])('treats %s as a missing record', (code) => {
    expect(isNotFoundError({ code })).toBe(true)
  })

  it.each([{ code: '57014' }, { code: undefined }, null, undefined])(
    'does not treat %o as a missing record',
    (error) => {
      expect(isNotFoundError(error)).toBe(false)
    }
  )
})

describe('getRecordError', () => {
  it('returns nothing when the record loaded', () => {
    expect(getRecordError('Activity', { id: 'a1' }, null)).toBeNull()
  })

  it('answers 404 when the record does not exist', () => {
    expect(getRecordError('Activity', null, null)).toMatchObject({
      statusCode: 404,
      statusMessage: 'Activity not found',
    })
    expect(getRecordError('Activity', null, null)?.fatal).toBe(false)
  })

  it('answers 503 when loading failed, so search engines retry instead of dropping the page', () => {
    expect(getRecordError('Place', null, new Error('db down'))).toMatchObject({
      statusCode: 503,
      statusMessage: 'Place could not be loaded',
      fatal: true,
    })
  })
})
