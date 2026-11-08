import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  TRACKING_EVENT_TYPES,
  TRACKING_PAYLOAD_MAX_LENGTH,
  VALIDATION_ERRORS,
  trackingEventSchema,
} from '../src'

const legacyTrackingSchema = z.object({
  event_type: z.enum(TRACKING_EVENT_TYPES),
  session_id: z.string().min(1).max(100),
  locale: z.string().min(1).max(10),
  payload: z
    .record(z.string(), z.unknown())
    .refine((p) => JSON.stringify(p).length <= 4000, 'payload too large'),
})

const VALID_EVENT = {
  event_type: 'search',
  session_id: 'session-1',
  locale: 'he',
  payload: { query: 'park' },
}

const SAMPLES: unknown[] = [
  VALID_EVENT,
  { ...VALID_EVENT, event_type: 'unknown_event' },
  { ...VALID_EVENT, session_id: '' },
  { ...VALID_EVENT, session_id: 'a'.repeat(101) },
  { ...VALID_EVENT, locale: '' },
  { ...VALID_EVENT, locale: 'a'.repeat(11) },
  { ...VALID_EVENT, payload: { big: 'a'.repeat(TRACKING_PAYLOAD_MAX_LENGTH) } },
  { ...VALID_EVENT, payload: 'not an object' },
  { event_type: 'page_view' },
]

describe('trackingEventSchema', () => {
  it.each(SAMPLES.map((sample, index) => [index, sample]))(
    'accepts and rejects exactly like the current endpoint schema (sample %i)',
    (_, sample) => {
      expect(trackingEventSchema.safeParse(sample).success).toBe(
        legacyTrackingSchema.safeParse(sample).success
      )
    }
  )

  it('reports unknown event types as an invalid option', () => {
    expect(
      trackingEventSchema.safeParse({ ...VALID_EVENT, event_type: 'nope' }).error?.issues[0]
        ?.message
    ).toBe(VALIDATION_ERRORS.invalidOption)
  })

  it('reports oversized payloads with a dedicated key', () => {
    const payload = { big: 'a'.repeat(TRACKING_PAYLOAD_MAX_LENGTH) }
    expect(
      trackingEventSchema.safeParse({ ...VALID_EVENT, payload }).error?.issues[0]?.message
    ).toBe(VALIDATION_ERRORS.payloadTooLarge)
  })
})
