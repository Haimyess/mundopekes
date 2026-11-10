const formatters = new Map<string, Intl.DateTimeFormat>()

export function formatIsoDate(isoDate: string, locale: string): string {
  const cached = formatters.get(locale)
  const formatter =
    cached ??
    new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
  if (!cached) formatters.set(locale, formatter)
  return formatter.format(new Date(`${isoDate}T00:00:00Z`))
}
