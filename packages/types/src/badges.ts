export const ACTIVITY_BADGE_KEYS = [
  'is_free',
  'stroller_friendly',
  'open_weekends',
  'has_shadow',
  'has_bathrooms',
] as const

export type ActivityBadgeKey = (typeof ACTIVITY_BADGE_KEYS)[number]

export type ActivityBadgeSource = Partial<Record<ActivityBadgeKey, boolean | null>>

export const getActivityBadges = (
  source: ActivityBadgeSource | null | undefined
): ActivityBadgeKey[] => {
  if (!source) return []
  return ACTIVITY_BADGE_KEYS.filter((key) => !!source[key])
}
