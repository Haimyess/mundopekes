import { describe, expect, it } from 'vitest'
import { formatPrice } from '~/app/utils/format-price'

describe('formatPrice', () => {
  it.each(['es', 'en', 'he', 'ru'])('uses the shekel sign without decimals in %s', (locale) => {
    const formatted = formatPrice(1400.5, locale)
    expect(formatted).toContain('₪')
    expect(formatted).not.toContain('ILS')
    expect(formatted.replace(/\D/g, '')).toBe('1401')
  })
})
