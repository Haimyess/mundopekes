import {
  QUICK_SUGGESTION_SOURCE,
  SUGGESTION_LIMITS,
  suggestionShortFormSchema,
  type SuggestionOrigin,
} from '@mundopekes/schemas'

export type QuickSuggestionField = 'name' | 'where' | 'link' | 'why'

export function useQuickSuggestion(origin: SuggestionOrigin) {
  return useVerifiedForm({
    schema: suggestionShortFormSchema,
    initial: () => ({ name: '', where: '', link: '', why: '' }),
    limits: {
      name: { min: SUGGESTION_LIMITS.minText, max: SUGGESTION_LIMITS.name },
      where: { min: SUGGESTION_LIMITS.minText, max: SUGGESTION_LIMITS.where },
      link: { max: SUGGESTION_LIMITS.link },
      why: { max: SUGGESTION_LIMITS.why },
    },
    endpoint: '/api/suggestions',
    buildBody: (data, context) => ({
      ...data,
      ...context,
      source: QUICK_SUGGESTION_SOURCE,
      origin,
    }),
  })
}
