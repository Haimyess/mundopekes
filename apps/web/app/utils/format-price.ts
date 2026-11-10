const CURRENCY = 'ILS'
const formatters = new Map<string, Intl.NumberFormat>()

export function formatPrice(price: number, locale: string): string {
  const cached = formatters.get(locale)
  const formatter =
    cached ??
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: CURRENCY,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    })
  if (!cached) formatters.set(locale, formatter)
  return formatter.format(price)
}
