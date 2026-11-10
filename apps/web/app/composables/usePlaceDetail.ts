import type { PlaceDetail } from '#shared/types/detail'

const NOT_FOUND = { statusCode: 404, statusMessage: 'Not Found' }

export async function usePlaceDetail(id: Ref<string>) {
  const { data, error } = await useFetch<PlaceDetail>(() => `/api/places/${id.value}`, {
    key: computed(() => `place-detail-${id.value}`),
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

  return { place: data }
}
