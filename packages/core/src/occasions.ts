import { addDays, type DateRange, type IsoDate } from './calendar'

export interface Occasion {
  key: string
  startsOn: IsoDate
  endsOn: IsoDate
}

export const OCCASION_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const UPCOMING_OCCASION_HORIZON_DAYS = 21

function isNotOver(occasion: Occasion, today: IsoDate): boolean {
  return occasion.endsOn >= today
}

function byStartDate(first: Occasion, second: Occasion): number {
  return first.startsOn.localeCompare(second.startsOn)
}

export function findOccasionRange(
  occasions: readonly Occasion[],
  key: string,
  today: IsoDate
): DateRange | null {
  const [next] = occasions
    .filter((occasion) => occasion.key === key && isNotOver(occasion, today))
    .sort(byStartDate)
  if (!next) return null
  return { from: next.startsOn > today ? next.startsOn : today, to: next.endsOn }
}

export function findUpcomingOccasion<T extends Occasion>(
  occasions: readonly T[],
  today: IsoDate,
  horizonDays: number = UPCOMING_OCCASION_HORIZON_DAYS
): T | null {
  const horizon = addDays(today, horizonDays)
  const [next] = occasions
    .filter((occasion) => isNotOver(occasion, today) && occasion.startsOn <= horizon)
    .sort(byStartDate)
  return next ?? null
}
