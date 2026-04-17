/**
 * Constantes del proyecto
 */

import type { ActivityType, Season } from '~/types'

/**
 * Tipos de actividades disponibles
 */
export const ACTIVITY_TYPES: { value: ActivityType; label: string; emoji: string }[] = [
  { value: 'parque', label: 'Parque', emoji: '🌳' },
  { value: 'museo', label: 'Museo', emoji: '🏛️' },
  { value: 'biblioteca', label: 'Biblioteca', emoji: '📚' },
  { value: 'indoor', label: 'Interior', emoji: '🏠' },
  { value: 'outdoor', label: 'Exterior', emoji: '🌞' },
  { value: 'acuatico', label: 'Acuático', emoji: '💦' },
  { value: 'cultural', label: 'Cultural', emoji: '🎭' },
  { value: 'deportivo', label: 'Deportivo', emoji: '⚽' },
  { value: 'educativo', label: 'Educativo', emoji: '🎓' },
  { value: 'granja', label: 'Granja', emoji: '🐄' },
  { value: 'playa', label: 'Playa', emoji: '🏖️' }
]

/**
 * Temporadas/Estaciones
 */
export const SEASONS: { value: Season; label: string; emoji: string }[] = [
  { value: 'primavera', label: 'Primavera', emoji: '🌸' },
  { value: 'verano', label: 'Verano', emoji: '☀️' },
  { value: 'otoño', label: 'Otoño', emoji: '🍂' },
  { value: 'invierno', label: 'Invierno', emoji: '❄️' },
  { value: 'todo el año', label: 'Todo el año', emoji: '📅' }
]

/**
 * Ciudades principales de Israel
 */
export const CITIES = [
  'Tel Aviv',
  'Jerusalem',
  'Haifa',
  'Rishon LeZion',
  'Petah Tikva',
  'Ashdod',
  'Netanya',
  'Beer Sheva',
  'Holon',
  'Ramat Gan',
  'Ashkelon',
  'Rehovot',
  'Bat Yam',
  'Herzliya',
  'Kfar Saba',
  'Hadera',
  'Ra\'anana',
  'Modiin',
  'Nazareth',
  'Lod'
] as const

/**
 * Rangos de edad predefinidos (en meses)
 */
export const AGE_RANGES = [
  { label: '0-6 meses', min: 0, max: 6 },
  { label: '6-12 meses', min: 6, max: 12 },
  { label: '1-2 años', min: 12, max: 24 },
  { label: '2-3 años', min: 24, max: 36 },
  { label: '3-4 años', min: 36, max: 48 },
  { label: '4-5 años', min: 48, max: 60 },
  { label: '5+ años', min: 60, max: 120 }
] as const

/**
 * Límites de paginación
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 50,
  CAROUSEL_LIMIT: 10
} as const

/**
 * Configuración de carruseles en home
 */
export const CAROUSEL_CONFIG = {
  RECENT: {
    title: 'Agregadas recientemente',
    emoji: '✨',
    limit: 10
  },
  NEARBY: {
    title: 'Cerca de ti',
    emoji: '📍',
    limit: 10
  },
  POPULAR: {
    title: 'Populares',
    emoji: '🔥',
    limit: 10
  },
  RECOMMENDED: {
    title: 'Recomendadas',
    emoji: '⭐',
    limit: 10
  }
} as const

/**
 * Configuración de Supabase Storage
 */
export const STORAGE = {
  BUCKET_NAME: 'activity-images',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_IMAGES_PER_ACTIVITY: 5
} as const

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Este campo es obligatorio',
  INVALID_EMAIL: 'Email inválido',
  INVALID_AGE_RANGE: 'Rango de edad inválido',
  FILE_TOO_LARGE: `El archivo es muy grande. Máximo ${STORAGE.MAX_FILE_SIZE / 1024 / 1024}MB`,
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido. Solo JPG, PNG o WEBP',
  NETWORK_ERROR: 'Error de conexión. Intenta de nuevo',
  UNKNOWN_ERROR: 'Ocurrió un error inesperado'
} as const