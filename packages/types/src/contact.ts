export const CONTACT_INTENTS = [
  'outdated_activity',
  'feedback',
  'provider_inquiry',
  'other',
] as const

export type ContactIntent = (typeof CONTACT_INTENTS)[number]
