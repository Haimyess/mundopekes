// Única fuente de verdad de qué campos booleanos de una Activity cuentan
// como "badge"/feature — antes esta lista vivía reimplementada suelta en
// ~5 componentes de apps/web (ActivityCard, PlaceActivityRow, Meta,
// InfoFeatures) y en el admin, con cobertura inconsistente: has_shadow/
// has_bathrooms estaban modelados en la DB y editables en el form del admin,
// pero nunca se mostraban en el sitio público (confirmado 2026-08-29,
// agregado acá). El ícono/color de cada badge sigue siendo decisión de cada
// componente según su propio contexto visual — lo único que se centraliza es
// "cuáles son" y "cuándo aplican".
export const ACTIVITY_BADGE_KEYS = [
  'is_free',
  'stroller_friendly',
  'open_weekends',
  'has_shadow',
  'has_bathrooms',
] as const

export type ActivityBadgeKey = (typeof ACTIVITY_BADGE_KEYS)[number]

export interface ActivityBadgeSource {
  is_free?: boolean | null
  stroller_friendly?: boolean | null
  open_weekends?: boolean | null
  has_shadow?: boolean | null
  has_bathrooms?: boolean | null
}
