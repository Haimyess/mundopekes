import { weekdayOf, WEEKDAYS, type IsoDate } from './calendar'
import { findUpcomingOccasion, type Occasion } from './occasions'
import type { When } from './when'

export const HOME_OCCASION_HORIZON_DAYS = 7

export const HOME_CAROUSEL_MIN_ITEMS = 4

const WEEKEND_LEAD_DAYS = new Set<number>([WEEKDAYS.thursday, WEEKDAYS.friday, WEEKDAYS.saturday])

export type HomeContext<T extends Occasion = Occasion> =
  { kind: 'occasion'; occasion: T } | { kind: 'shabat' } | { kind: 'today' }

export function selectHomeContext<T extends Occasion>(
  today: IsoDate,
  occasions: readonly T[]
): HomeContext<T> {
  const occasion = findUpcomingOccasion(occasions, today, HOME_OCCASION_HORIZON_DAYS)
  if (occasion) return { kind: 'occasion', occasion }
  return WEEKEND_LEAD_DAYS.has(weekdayOf(today)) ? { kind: 'shabat' } : { kind: 'today' }
}

export function homeContextWhen(context: HomeContext): When {
  if (context.kind === 'occasion') return { kind: 'occasion', key: context.occasion.key }
  return { kind: 'shortcut', shortcut: context.kind === 'shabat' ? 'shabat' : 'today' }
}
