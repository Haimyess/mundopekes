import validator from 'validator'

/**
 * Sanitizes user-supplied search input before interpolating into PostgREST
 * filter strings. Removes characters that break the .or() filter syntax
 * and limits length to prevent abuse.
 */
export const sanitizeSearchQuery = (value: string): string =>
  validator.escape(
    validator
      .stripLow(validator.trim(value))
      .slice(0, 100)
      .replace(/[(),']/g, '')
  )
