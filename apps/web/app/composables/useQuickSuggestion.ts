import {
  QUICK_SUGGESTION_SOURCE,
  SUGGESTION_LIMITS,
  suggestionShortFormSchema,
  type SuggestionOrigin,
} from '@mundopekes/schemas'

export type QuickSuggestionField = 'name' | 'where' | 'link' | 'why'
export type QuickSuggestionStatus = 'idle' | 'submitting' | 'success' | 'error'
export type QuickSuggestionFailure = 'rateLimited' | 'verification' | 'generic'

const FIELD_LIMITS: Record<QuickSuggestionField, { min?: number; max: number }> = {
  name: { min: SUGGESTION_LIMITS.minText, max: SUGGESTION_LIMITS.name },
  where: { min: SUGGESTION_LIMITS.minText, max: SUGGESTION_LIMITS.where },
  link: { max: SUGGESTION_LIMITS.link },
  why: { max: SUGGESTION_LIMITS.why },
}

const EMPTY_FORM = (): Record<QuickSuggestionField, string> => ({
  name: '',
  where: '',
  link: '',
  why: '',
})

function failureFor(statusCode: number | undefined): QuickSuggestionFailure {
  if (statusCode === 429) return 'rateLimited'
  if (statusCode === 403 || statusCode === 503) return 'verification'
  return 'generic'
}

export function useQuickSuggestion(origin: SuggestionOrigin) {
  const { t, locale } = useI18n()
  const form = reactive(EMPTY_FORM())
  const touched = reactive(new Set<QuickSuggestionField>())
  const token = ref<string | null>(null)
  const status = ref<QuickSuggestionStatus>('idle')
  const failure = ref<QuickSuggestionFailure | null>(null)

  const validation = computed(() => suggestionShortFormSchema.safeParse(form))
  const issues = computed(() => {
    const map = new Map<QuickSuggestionField, string>()
    for (const issue of validation.value.error?.issues ?? []) {
      const field = issue.path[0] as QuickSuggestionField
      if (!map.has(field)) map.set(field, issue.message)
    }
    return map
  })

  function errorFor(field: QuickSuggestionField): string | undefined {
    const key = issues.value.get(field)
    if (!key || !touched.has(field)) return undefined
    return t(key, FIELD_LIMITS[field])
  }

  function touch(field: QuickSuggestionField) {
    touched.add(field)
  }

  const canSubmit = computed(
    () => validation.value.success && !!token.value && status.value !== 'submitting'
  )

  async function submit(): Promise<boolean> {
    for (const field of Object.keys(form) as QuickSuggestionField[]) touch(field)
    if (!validation.value.success || !token.value) return false
    status.value = 'submitting'
    failure.value = null
    try {
      await $fetch('/api/suggestions', {
        method: 'POST',
        body: {
          ...validation.value.data,
          source: QUICK_SUGGESTION_SOURCE,
          origin,
          locale: locale.value,
          turnstileToken: token.value,
        },
      })
      status.value = 'success'
      return true
    } catch (error) {
      status.value = 'error'
      failure.value = failureFor((error as { statusCode?: number }).statusCode)
      token.value = null
      return false
    }
  }

  function reset() {
    Object.assign(form, EMPTY_FORM())
    touched.clear()
    token.value = null
    status.value = 'idle'
    failure.value = null
  }

  return { form, token, status, failure, canSubmit, errorFor, touch, submit, reset }
}
