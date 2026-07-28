// Tipos y helpers de horario por día compartidos entre el wizard del frontend
// (apps/web) y los formularios del admin (apps/admin).

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

// Orden de los días para iterar/renderear (domingo → sábado, como en Israel).
export const SCHEDULE_DAYS: (keyof WizardSchedule)[] = [
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
