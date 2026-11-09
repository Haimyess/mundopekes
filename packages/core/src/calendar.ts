export const ISRAEL_TIME_ZONE = 'Asia/Jerusalem'

export const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
} as const

export type Weekday = (typeof WEEKDAYS)[keyof typeof WEEKDAYS]

export type IsoDate = string

export interface DateRange {
  from: IsoDate
  to: IsoDate
}

export interface ZonedMoment {
  date: IsoDate
  weekday: Weekday
  minutes: number
}

const MS_PER_DAY = 86_400_000
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const formatters = new Map<string, Intl.DateTimeFormat>()

function toUtcMs(date: IsoDate): number {
  const match = ISO_DATE_PATTERN.exec(date)
  if (!match) throw new RangeError(`Invalid ISO date: ${date}`)
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10)
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false
  return fromUtcMs(toUtcMs(value)) === value
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY)
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY)
}

export function weekdayOf(date: IsoDate): Weekday {
  return new Date(toUtcMs(date)).getUTCDay() as Weekday
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  formatters.set(timeZone, formatter)
  return formatter
}

export function toZonedMoment(instant: Date, timeZone: string = ISRAEL_TIME_ZONE): ZonedMoment {
  const parts = Object.fromEntries(
    getFormatter(timeZone)
      .formatToParts(instant)
      .map(({ type, value }) => [type, value])
  )
  const date = `${parts.year}-${parts.month}-${parts.day}`
  return {
    date,
    weekday: weekdayOf(date),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

export function todayIn(timeZone: string = ISRAEL_TIME_ZONE, now: Date = new Date()): IsoDate {
  return toZonedMoment(now, timeZone).date
}
