import { formatMinutes, parseOpeningHoursText, type Weekday } from '@mundopekes/core'
import { defaultSchedule, SCHEDULE_DAYS, type WizardSchedule } from '@mundopekes/types'

export function parseGoogleHoursToSchedule(
  weekdayText: string[] | null | undefined
): WizardSchedule {
  const schedule = defaultSchedule()
  const hours = parseOpeningHoursText(weekdayText)
  if (!hours) return schedule

  SCHEDULE_DAYS.forEach((day, index) => {
    const intervals = hours[index as Weekday]
    if (!intervals) return
    const [first] = intervals
    schedule[day] = first
      ? { open: true, start: formatMinutes(first.start), end: formatMinutes(first.end) }
      : { ...schedule[day], open: false }
  })

  return schedule
}
