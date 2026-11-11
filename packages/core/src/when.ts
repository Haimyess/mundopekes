import {
  addDays,
  daysBetween,
  isIsoDate,
  weekdayOf,
  WEEKDAYS,
  type DateRange,
  type IsoDate,
} from './calendar'
import { findOccasionRange, OCCASION_KEY_PATTERN, type Occasion } from './occasions'

export const WHEN_SHORTCUTS = ['today', 'tomorrow', 'this-weekend', 'shabat'] as const

export type WhenShortcut = (typeof WHEN_SHORTCUTS)[number]

export const EVERGREEN_WHEN_SHORTCUTS: readonly WhenShortcut[] = ['this-weekend', 'shabat']

export type When =
  | { kind: 'shortcut'; shortcut: WhenShortcut }
  | { kind: 'occasion'; key: string }
  | { kind: 'fixed'; range: DateRange }

export interface WhenContext {
  today: IsoDate
  occasions: readonly Occasion[]
}

export const WHEN_LIMITS = {
  maxLength: 40,
  maxFixedDays: 31,
} as const

const OCCASION_PREFIX = 'occasion:'
const FIXED_PREFIX = 'fixed:'
const RANGE_SEPARATOR = '/'

function isShortcut(value: string): value is WhenShortcut {
  return (WHEN_SHORTCUTS as readonly string[]).includes(value)
}

function parseFixedRange(value: string): DateRange | null {
  const [from, to = from, ...rest] = value.split(RANGE_SEPARATOR)
  if (rest.length > 0 || !from || !to || !isIsoDate(from) || !isIsoDate(to)) return null
  const length = daysBetween(from, to)
  if (length < 0 || length >= WHEN_LIMITS.maxFixedDays) return null
  return { from, to }
}

export function parseWhen(raw: string): When | null {
  const value = raw.trim()
  if (!value || value.length > WHEN_LIMITS.maxLength) return null
  if (isShortcut(value)) return { kind: 'shortcut', shortcut: value }
  if (value.startsWith(OCCASION_PREFIX)) {
    const key = value.slice(OCCASION_PREFIX.length)
    return OCCASION_KEY_PATTERN.test(key) ? { kind: 'occasion', key } : null
  }
  if (value.startsWith(FIXED_PREFIX)) {
    const range = parseFixedRange(value.slice(FIXED_PREFIX.length))
    return range ? { kind: 'fixed', range } : null
  }
  return null
}

export function isEvergreenWhen(when: When): boolean {
  if (when.kind === 'occasion') return true
  return when.kind === 'shortcut' && EVERGREEN_WHEN_SHORTCUTS.includes(when.shortcut)
}

export function serializeWhen(when: When): string {
  if (when.kind === 'shortcut') return when.shortcut
  if (when.kind === 'occasion') return `${OCCASION_PREFIX}${when.key}`
  const { from, to } = when.range
  return from === to ? `${FIXED_PREFIX}${from}` : `${FIXED_PREFIX}${from}${RANGE_SEPARATOR}${to}`
}

function nextWeekday(today: IsoDate, weekday: number): IsoDate {
  return addDays(today, (weekday - weekdayOf(today) + 7) % 7)
}

function resolveWeekend(today: IsoDate): DateRange {
  if (weekdayOf(today) === WEEKDAYS.saturday) return { from: today, to: today }
  const friday = nextWeekday(today, WEEKDAYS.friday)
  return { from: friday, to: addDays(friday, 1) }
}

function resolveShortcut(shortcut: WhenShortcut, today: IsoDate): DateRange {
  switch (shortcut) {
    case 'today':
      return { from: today, to: today }
    case 'tomorrow': {
      const tomorrow = addDays(today, 1)
      return { from: tomorrow, to: tomorrow }
    }
    case 'this-weekend':
      return resolveWeekend(today)
    case 'shabat': {
      const saturday = nextWeekday(today, WEEKDAYS.saturday)
      return { from: saturday, to: saturday }
    }
  }
}

export function resolveWhen(when: When, context: WhenContext): DateRange | null {
  if (when.kind === 'shortcut') return resolveShortcut(when.shortcut, context.today)
  if (when.kind === 'occasion') return findOccasionRange(context.occasions, when.key, context.today)
  return when.range
}
