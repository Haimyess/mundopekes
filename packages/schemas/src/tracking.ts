import { z } from 'zod'
import { VALIDATION_ERRORS } from './errors'

export const TRACKING_EVENT_TYPES = [
  'page_view',
  'search',
  'activity_view',
  'place_view',
  'directions_click',
  'contact_send',
  'suggestion_submit',
  'provider_interest',
] as const

export const TRACKING_PAYLOAD_MAX_LENGTH = 4000

export const trackingEventSchema = z.object({
  event_type: z.enum(TRACKING_EVENT_TYPES, { error: VALIDATION_ERRORS.invalidOption }),
  session_id: z.string().min(1).max(100),
  locale: z.string().min(1).max(10),
  payload: z
    .record(z.string(), z.unknown())
    .refine((payload) => JSON.stringify(payload).length <= TRACKING_PAYLOAD_MAX_LENGTH, {
      error: VALIDATION_ERRORS.payloadTooLarge,
    }),
})

export type TrackingEventType = (typeof TRACKING_EVENT_TYPES)[number]
export type TrackingEvent = z.output<typeof trackingEventSchema>
