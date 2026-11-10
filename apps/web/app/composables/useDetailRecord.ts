import type { Ref } from 'vue'

const NOT_FOUND = { statusCode: 404, statusMessage: 'Not Found' }

export type DetailResource = 'places' | 'activities'

export async function useDetailRecord<T>(resource: DetailResource, id: Ref<string>) {
  const { data, error } = await useFetch<T>(() => `/api/${resource}/${id.value}`, {
    key: computed(() => `${resource}-detail-${id.value}`),
  })

  const failure = computed(() =>
    error.value
      ? { statusCode: error.value.statusCode ?? 500, statusMessage: error.value.statusMessage }
      : null
  )

  if (failure.value) throw createError(failure.value)
  if (!data.value) throw createError(NOT_FOUND)

  watch(failure, (value) => {
    if (value) showError(value)
  })

  return { record: data as Ref<T> }
}
