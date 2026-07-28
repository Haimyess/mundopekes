// Mapea el `opening_hours.weekday_text` de Google (solo la pasada en INGLÉS) a la
// estructura WizardSchedule por día. Best-effort: cualquier línea que no se pueda
// parsear conserva el default de ese día. Para he/ru NO se intenta parsear (los
// strings están localizados); el usuario edita manualmente.
import { defaultSchedule, type WizardSchedule } from '../types/schedule'

const DAY_BY_NAME: Record<string, keyof WizardSchedule> = {
  sunday: 'sunday',
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
}

// "9:00 AM" → "09:00", "5:00 PM" → "17:00", "12:00 AM" → "00:00", "12:30 PM" → "12:30"
function to24h(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return null
  let hour = Number.parseInt(m[1]!, 10)
  const min = m[2]!
  const period = m[3]?.toUpperCase()
  if (period === 'AM') {
    if (hour === 12) hour = 0
  } else if (period === 'PM') {
    if (hour !== 12) hour += 12
  }
  if (hour < 0 || hour > 23) return null
  return `${String(hour).padStart(2, '0')}:${min}`
}

/**
 * Convierte el weekday_text en inglés de Google a un WizardSchedule.
 * Si `weekdayText` es nulo/vacío o ninguna línea es parseable, devuelve defaultSchedule().
 */
export function parseGoogleHoursToSchedule(
  weekdayText: string[] | null | undefined
): WizardSchedule {
  const schedule = defaultSchedule()
  if (!weekdayText?.length) return schedule

  for (const line of weekdayText) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const dayName = line.slice(0, idx).trim().toLowerCase()
    const spec = line.slice(idx + 1).trim()
    const key = DAY_BY_NAME[dayName]
    if (!key) continue

    if (/closed/i.test(spec)) {
      schedule[key] = { open: false, start: schedule[key].start, end: schedule[key].end }
      continue
    }

    if (/24\s*hours/i.test(spec)) {
      schedule[key] = { open: true, start: '00:00', end: '23:59' }
      continue
    }

    // Tomamos el primer rango "h:mm AM – h:mm PM" (separador en-dash U+2013 o guion normal)
    const parts = spec.split(/[–-]/).map((p) => p.trim())
    if (parts.length < 2) continue
    const start = to24h(parts[0]!)
    const end = to24h(parts[1]!)
    if (start && end) {
      schedule[key] = { open: true, start, end }
    }
  }

  return schedule
}
