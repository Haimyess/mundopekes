/**
 * Funciones helper reutilizables
 */

import dayjs from 'dayjs'
import 'dayjs/locale/es'
import relativeTime from 'dayjs/plugin/relativeTime'

// Configurar dayjs
dayjs.extend(relativeTime)
dayjs.locale('es')

/**
 * Formatear fecha relativa (hace 2 días, hace 1 mes, etc.)
 */
export function formatRelativeTime(date: string): string {
  return dayjs(date).fromNow()
}

/**
 * Formatear fecha absoluta (21 de marzo, 2026)
 */
export function formatDate(date: string, format: string = 'D [de] MMMM, YYYY'): string {
  return dayjs(date).format(format)
}

/**
 * Calcular distancia entre dos coordenadas (Haversine formula)
 * @returns distancia en kilómetros
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance * 10) / 10 // Redondear a 1 decimal
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Formatear distancia para mostrar al usuario
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km}km`
}

/**
 * Convertir meses a etiqueta de edad legible
 */
export function formatAgeRange(minMonths: number, maxMonths: number): string {
  const formatAge = (months: number): string => {
    if (months < 12) {
      return `${months} ${months === 1 ? 'mes' : 'meses'}`
    }
    const years = Math.floor(months / 12)
    return `${years} ${years === 1 ? 'año' : 'años'}`
  }

  return `${formatAge(minMonths)} - ${formatAge(maxMonths)}`
}

/**
 * Truncar texto con ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Validar si un archivo es una imagen válida
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  return validTypes.includes(file.type) && file.size <= maxSize
}

/**
 * Generar slug de URL desde un string
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Espacios a guiones
    .replace(/[^\w\-]+/g, '') // Remover caracteres especiales
    .replace(/-{2,}/g, '-')   // Múltiples guiones a uno solo
}

/**
 * Obtener URL de imagen de Supabase Storage
 */
export function getImageUrl(path: string): string {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  return `${supabaseUrl}/storage/v1/object/public/activity-images/${path}`
}

/**
 * Validar si una actividad coincide con los filtros
 */
export function matchesFilters(
  activity: any,
  filters: any
): boolean {
  // Ciudad
  if (filters.city && activity.location.city !== filters.city) {
    return false
  }

  // Tipo
  if (filters.type && filters.type.length > 0) {
    const hasMatchingType = filters.type.some((t: string) => 
      activity.type.includes(t)
    )
    if (!hasMatchingType) return false
  }

  // Edad
  if (filters.age_min !== undefined && filters.age_max !== undefined) {
    const activityMinAge = activity.age_range.min
    const activityMaxAge = activity.age_range.max
    
    // Verificar que haya solapamiento de rangos
    if (activityMaxAge < filters.age_min || activityMinAge > filters.age_max) {
      return false
    }
  }

  // Gratis
  if (filters.is_free === true && !activity.is_free) {
    return false
  }

  // Apto para coches
  if (filters.stroller_friendly === true && !activity.stroller_friendly) {
    return false
  }

  // Abierto fines de semana
  if (filters.open_weekends === true && !activity.open_weekends) {
    return false
  }

  // Búsqueda por texto
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    const matchesName = activity.name.toLowerCase().includes(searchLower)
    const matchesDescription = activity.description?.toLowerCase().includes(searchLower)
    
    if (!matchesName && !matchesDescription) {
      return false
    }
  }

  return true
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
