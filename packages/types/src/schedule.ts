export interface ScheduleDay {
  open: boolean
  start: string
  end: string
}

export interface WizardSchedule {
  sunday: ScheduleDay
  monday: ScheduleDay
  tuesday: ScheduleDay
  wednesday: ScheduleDay
  thursday: ScheduleDay
  friday: ScheduleDay
  saturday: ScheduleDay
}

export const SCHEDULE_DAYS: readonly (keyof WizardSchedule)[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

export const defaultSchedule = (): WizardSchedule => ({
  sunday: { open: false, start: '09:00', end: '17:00' },
  monday: { open: true, start: '09:00', end: '17:00' },
  tuesday: { open: true, start: '09:00', end: '17:00' },
  wednesday: { open: true, start: '09:00', end: '17:00' },
  thursday: { open: true, start: '09:00', end: '17:00' },
  friday: { open: false, start: '09:00', end: '14:00' },
  saturday: { open: false, start: '10:00', end: '16:00' },
})

const hasTime = (value: string | undefined): value is string => !!value?.trim()

export const mergeSchedule = (
  stored: Partial<WizardSchedule> | null | undefined
): WizardSchedule => {
  const defaults = defaultSchedule()
  const result = {} as WizardSchedule
  for (const day of SCHEDULE_DAYS) {
    const storedDay = stored?.[day]
    result[day] = {
      open: storedDay?.open ?? defaults[day].open,
      start: hasTime(storedDay?.start) ? storedDay.start : defaults[day].start,
      end: hasTime(storedDay?.end) ? storedDay.end : defaults[day].end,
    }
  }
  return result
}
