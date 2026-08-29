import {
  ACTIVITY_BADGE_KEYS,
  type ActivityBadgeKey,
  type ActivityBadgeSource,
} from '../config/badges'

// Devuelve las claves de badge que aplican para una activity dada, en el
// orden canónico de ACTIVITY_BADGE_KEYS. Cada consumidor decide su propio
// ícono/label/estilo por key — ver layers/domain/config/badges.ts.
export function useActivityBadges(
  source: ActivityBadgeSource | null | undefined
): ActivityBadgeKey[] {
  if (!source) return []
  return ACTIVITY_BADGE_KEYS.filter((key) => !!source[key])
}
