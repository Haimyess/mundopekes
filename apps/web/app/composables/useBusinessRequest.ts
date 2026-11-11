import {
  BUSINESS_LIMITS,
  businessClaimFormSchema,
  businessJoinFormSchema,
  type BusinessRole,
} from '@mundopekes/schemas'

const ENDPOINT = '/api/business-requests'

const TEXT_LIMITS = (max: number) => ({ min: BUSINESS_LIMITS.minText, max })

export function useBusinessJoin() {
  return useVerifiedForm({
    schema: businessJoinFormSchema,
    initial: () => ({ businessName: '', activityType: '', city: '', phone: '' }),
    limits: {
      businessName: TEXT_LIMITS(BUSINESS_LIMITS.businessName),
      activityType: TEXT_LIMITS(BUSINESS_LIMITS.activityType),
      city: TEXT_LIMITS(BUSINESS_LIMITS.city),
      phone: { max: BUSINESS_LIMITS.phone },
    },
    endpoint: ENDPOINT,
    buildBody: (data, context) => ({ ...data, ...context, kind: 'join' }),
  })
}

export function useBusinessClaim(placeId: string) {
  return useVerifiedForm({
    schema: businessClaimFormSchema,
    initial: () => ({
      role: null as BusinessRole | null,
      name: '',
      email: '',
      phone: '',
      acceptTerms: false,
    }),
    limits: {
      name: TEXT_LIMITS(BUSINESS_LIMITS.contactName),
      email: { max: BUSINESS_LIMITS.email },
      phone: { max: BUSINESS_LIMITS.phone },
    },
    endpoint: ENDPOINT,
    buildBody: (data, context) => ({ ...data, ...context, kind: 'claim', placeId }),
  })
}
