import { ISRAEL_TIME_ZONE, toZonedMoment, type Weekday, type ZonedMoment } from './calendar'

export interface TimeInterval {
  start: number
  end: number
}

export type WeeklyHours = Partial<Record<Weekday, readonly TimeInterval[]>>

export const MINUTES_PER_DAY = 1440

const DAY_NAMES: Readonly<Record<string, Weekday>> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  sabado: 6,
  'יום ראשון': 0,
  'יום שני': 1,
  'יום שלישי': 2,
  'יום רביעי': 3,
  'יום חמישי': 4,
  'יום שישי': 5,
  'יום שבת': 6,
  воскресенье: 0,
  понедельник: 1,
  вторник: 2,
  среда: 3,
  четверг: 4,
  пятница: 5,
  суббота: 6,
}

const INVISIBLE_CHARACTERS = /[\u200E\u200F\u202A-\u202E]/g
const SPACE_CHARACTERS = /[\u00A0\u2009\u202F]/g
const CLOSED_PATTERN = /closed|cerrado|סגור|закрыто/i
const ALWAYS_OPEN_PATTERN = /24\s*(?:hours|horas|שעות|час)|круглосуточно/i
const INTERVAL_SEPARATOR = /\s*[,;]\s*/
const BOUNDARY_SEPARATOR = /\s*[–—-]\s*/
const TIME_PATTERN = /^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?\s*m\.?)?$/i

interface ParsedTime {
  hours: number
  minutes: number
  period: 'am' | 'pm' | null
}

function normalize(text: string): string {
  return text.replace(INVISIBLE_CHARACTERS, '').replace(SPACE_CHARACTERS, ' ').trim()
}

function parseTime(raw: string): ParsedTime | null {
  const match = TIME_PATTERN.exec(raw)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2] ?? '0')
  const period = match[3] ? (match[3].toLowerCase().startsWith('p') ? 'pm' : 'am') : null
  if (minutes > 59 || hours > (period ? 12 : 24)) return null
  return { hours, minutes, period }
}

function toMinutes({ hours, minutes }: ParsedTime, period: ParsedTime['period']): number {
  const base = hours % 12
  if (period === 'am') return base * 60 + minutes
  if (period === 'pm') return (base + 12) * 60 + minutes
  return hours * 60 + minutes
}

function parseInterval(raw: string): TimeInterval | null {
  const boundaries = raw.split(BOUNDARY_SEPARATOR)
  if (boundaries.length !== 2) return null
  const opening = parseTime(boundaries[0]!)
  const closing = parseTime(boundaries[1]!)
  if (!opening || !closing) return null
  const start = toMinutes(opening, opening.period ?? closing.period)
  const end = toMinutes(closing, closing.period)
  if (start >= MINUTES_PER_DAY) return null
  return { start, end: end <= start ? end + MINUTES_PER_DAY : end }
}

function parseDaySpec(spec: string): TimeInterval[] | null {
  if (ALWAYS_OPEN_PATTERN.test(spec)) return [{ start: 0, end: MINUTES_PER_DAY }]
  if (CLOSED_PATTERN.test(spec)) return []
  const intervals = spec.split(INTERVAL_SEPARATOR).map(parseInterval)
  if (intervals.length === 0 || intervals.includes(null)) return null
  return (intervals as TimeInterval[]).sort((first, second) => first.start - second.start)
}

export function parseOpeningHoursText(
  lines: readonly string[] | null | undefined
): WeeklyHours | null {
  if (!lines?.length) return null
  const hours: WeeklyHours = {}
  for (const rawLine of lines) {
    const line = normalize(rawLine)
    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) continue
    const weekday = DAY_NAMES[line.slice(0, separatorIndex).trim().toLowerCase()]
    const intervals = parseDaySpec(line.slice(separatorIndex + 1).trim())
    if (weekday === undefined || !intervals) continue
    hours[weekday] = intervals
  }
  return Object.keys(hours).length > 0 ? hours : null
}

function previousWeekday(weekday: Weekday): Weekday {
  return ((weekday + 6) % 7) as Weekday
}

export function isOpenAt(hours: WeeklyHours, moment: Omit<ZonedMoment, 'date'>): boolean | null {
  const today = hours[moment.weekday]
  const yesterday = hours[previousWeekday(moment.weekday)]
  const isOpenFromYesterday = (yesterday ?? []).some(
    ({ end }) => end > MINUTES_PER_DAY && moment.minutes < end - MINUTES_PER_DAY
  )
  if (isOpenFromYesterday) return true
  if (!today) return null
  return today.some(({ start, end }) => moment.minutes >= start && moment.minutes < end)
}

export function isOpenNow(
  hours: WeeklyHours,
  now: Date = new Date(),
  timeZone: string = ISRAEL_TIME_ZONE
): boolean | null {
  return isOpenAt(hours, toZonedMoment(now, timeZone))
}

export function formatMinutes(minutes: number): string {
  if (minutes === MINUTES_PER_DAY) return '23:59'
  const normalized = minutes % MINUTES_PER_DAY
  const hours = Math.floor(normalized / 60)
  return `${String(hours).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}
