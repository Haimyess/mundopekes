import { describe, expect, it } from 'vitest'
import {
  SUGGESTION_LIMITS,
  VALIDATION_ERRORS,
  suggestionShortFormSchema,
  suggestionShortRequestSchema,
} from '../src'

const VALID_FORM = { name: 'Parque Hayarkon', where: 'Tel Aviv' }

const firstError = (input: unknown) =>
  suggestionShortFormSchema.safeParse(input).error?.issues[0]?.message

describe('suggestionShortFormSchema', () => {
  it('accepts the minimal required fields', () => {
    expect(suggestionShortFormSchema.parse(VALID_FORM)).toEqual(VALID_FORM)
  })

  it('trims text fields', () => {
    expect(suggestionShortFormSchema.parse({ name: '  Parque  ', where: ' Haifa ' })).toEqual({
      name: 'Parque',
      where: 'Haifa',
    })
  })

  it('requires a name', () => {
    expect(firstError({ ...VALID_FORM, name: '   ' })).toBe(VALIDATION_ERRORS.required)
    expect(firstError({ where: 'Tel Aviv' })).toBe(VALIDATION_ERRORS.required)
  })

  it('requires where the activity is', () => {
    expect(firstError({ ...VALID_FORM, where: '' })).toBe(VALIDATION_ERRORS.required)
  })

  it('limits the name length', () => {
    const name = 'a'.repeat(SUGGESTION_LIMITS.name + 1)
    expect(firstError({ ...VALID_FORM, name })).toBe(VALIDATION_ERRORS.tooLong)
  })

  it('accepts http and https links', () => {
    expect(
      suggestionShortFormSchema.parse({ ...VALID_FORM, link: 'https://example.com' }).link
    ).toBe('https://example.com')
    expect(
      suggestionShortFormSchema.parse({ ...VALID_FORM, link: 'http://example.com' }).link
    ).toBe('http://example.com')
  })

  it('treats an empty link as absent', () => {
    expect(suggestionShortFormSchema.parse({ ...VALID_FORM, link: '' }).link).toBeUndefined()
  })

  it.each(['javascript:alert(1)', 'ftp://example.com', 'not a url'])(
    'rejects the unsafe or invalid link %s',
    (link) => {
      expect(firstError({ ...VALID_FORM, link })).toBe(VALIDATION_ERRORS.invalidUrl)
    }
  )

  it('limits the reason length', () => {
    const why = 'a'.repeat(SUGGESTION_LIMITS.why + 1)
    expect(firstError({ ...VALID_FORM, why })).toBe(VALIDATION_ERRORS.tooLong)
  })
})

describe('suggestionShortRequestSchema', () => {
  it('requires a supported content locale', () => {
    expect(suggestionShortRequestSchema.parse({ ...VALID_FORM, locale: 'he' }).locale).toBe('he')
    expect(
      suggestionShortRequestSchema.safeParse({ ...VALID_FORM, locale: 'fr' }).error?.issues[0]
        ?.message
    ).toBe(VALIDATION_ERRORS.invalidOption)
  })
})
