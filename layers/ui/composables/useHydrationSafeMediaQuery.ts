interface HydrationSafeMediaQueryOptions {
  ssrValue?: boolean
}

export const useHydrationSafeMediaQuery = (
  query: string,
  { ssrValue = false }: HydrationSafeMediaQueryOptions = {}
) => {
  const isMounted = useMounted()
  const matches = useMediaQuery(query)
  return computed(() => (isMounted.value ? matches.value : ssrValue))
}
