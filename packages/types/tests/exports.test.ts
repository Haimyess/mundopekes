import { describe, expect, expectTypeOf, it } from 'vitest'
import { CONTACT_INTENTS, Constants } from '../src'
import type { ContactIntent, Database, Enums, Tables } from '../src'

describe('package exports', () => {
  it('exposes provider status values matching the database enum', () => {
    expectTypeOf<(typeof Constants.public.Enums.provider_status)[number]>().toEqualTypeOf<
      Enums<'provider_status'>
    >()
    expect(Constants.public.Enums.provider_status).toEqual([
      'pending',
      'active',
      'suspended',
      'rejected',
    ])
  })

  it('derives ContactIntent from CONTACT_INTENTS', () => {
    expectTypeOf<ContactIntent>().toEqualTypeOf<(typeof CONTACT_INTENTS)[number]>()
    expect(CONTACT_INTENTS).toEqual(['outdated_activity', 'feedback', 'provider_inquiry', 'other'])
  })

  it('resolves table row types from the Database schema', () => {
    expectTypeOf<Tables<'places'>>().toEqualTypeOf<Database['public']['Tables']['places']['Row']>()
    expectTypeOf<Tables<'places'>['id']>().toEqualTypeOf<string>()
  })
})
