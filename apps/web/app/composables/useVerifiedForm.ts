import type { z } from 'zod'

export type VerifiedFormStatus = 'idle' | 'submitting' | 'success' | 'error'
export type VerifiedFormFailure = 'rateLimited' | 'verification' | 'generic'
export type FieldLimits = { min?: number; max?: number }

export interface VerifiedSubmitContext {
  locale: string
  turnstileToken: string
}

export interface VerifiedFormOptions<Schema extends z.ZodObject, Form extends object> {
  schema: Schema
  initial: () => Form
  limits?: Partial<Record<keyof Form & string, FieldLimits>>
  endpoint: string
  buildBody: (data: z.output<Schema>, context: VerifiedSubmitContext) => Record<string, unknown>
}

function failureFor(statusCode: number | undefined): VerifiedFormFailure {
  if (statusCode === 429) return 'rateLimited'
  if (statusCode === 403 || statusCode === 503) return 'verification'
  return 'generic'
}

export function useVerifiedForm<Schema extends z.ZodObject, Form extends object>(
  options: VerifiedFormOptions<Schema, Form>
) {
  type Field = keyof Form & string

  const { t, locale } = useI18n()
  const form = reactive(options.initial()) as Form
  const touched = reactive(new Set<string>())
  const token = ref<string | null>(null)
  const status = ref<VerifiedFormStatus>('idle')
  const failure = ref<VerifiedFormFailure | null>(null)

  const validation = computed(() => options.schema.safeParse(form))
  const issues = computed(() => {
    const messages = new Map<Field, string>()
    for (const issue of validation.value.error?.issues ?? []) {
      const field = issue.path[0] as Field
      if (!messages.has(field)) messages.set(field, issue.message)
    }
    return messages
  })

  function errorFor(field: Field): string | undefined {
    const key = issues.value.get(field)
    if (!key || !touched.has(field)) return undefined
    const limits = options.limits?.[field]
    return limits ? t(key, limits) : t(key)
  }

  function touch(field: Field) {
    touched.add(field)
  }

  const canSubmit = computed(
    () => validation.value.success && !!token.value && status.value !== 'submitting'
  )

  async function submit(): Promise<boolean> {
    for (const field of Object.keys(form) as Field[]) touch(field)
    const result = validation.value
    if (!result.success || !token.value) return false
    status.value = 'submitting'
    failure.value = null
    try {
      await $fetch(options.endpoint, {
        method: 'POST',
        body: options.buildBody(result.data, {
          locale: locale.value,
          turnstileToken: token.value,
        }),
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
    Object.assign(form, options.initial())
    touched.clear()
    token.value = null
    status.value = 'idle'
    failure.value = null
  }

  return { form, token, status, failure, canSubmit, errorFor, touch, submit, reset }
}
