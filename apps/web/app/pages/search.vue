<script setup lang="ts">
import type { CategoryWithChildren } from '~/composables/useCategories'

const { t } = useI18n()
const { tc } = useI18nContent()
const { trackSearch } = useTracking()
const { searchLink } = useSearchLink()
const clearFiltersLink = computed(() => searchLink())
const { getNavCategoriesWithChildren } = useCategories()
const [{ state, response, isLoading, hasError, refresh }, { data: categories }] = await Promise.all(
  [
    useSearchResults(),
    useAsyncData('layout-nav-categories', getNavCategoriesWithChildren, { default: () => [] }),
  ]
)

function findCategoryName(list: readonly CategoryWithChildren[], slug: string) {
  const match = list
    .flatMap((category) => [category, ...category.children])
    .find((category) => category.slug === slug)
  return match ? tc(match.name_i18n) : null
}

const categoryName = computed(() =>
  state.value.category ? findCategoryName(categories.value, state.value.category) : null
)

const title = computed(() => {
  if (state.value.q) return t('results.titleQuery', { query: state.value.q })
  return categoryName.value ?? t('results.title')
})

const items = computed(() => response.value?.items ?? [])
const total = computed(() => (isLoading.value ? null : (response.value?.total ?? null)))
const page = computed(() => response.value?.page ?? 1)
const pageCount = computed(() => response.value?.pageCount ?? 1)
const occasion = computed(() => response.value?.occasion ?? null)
const pins = computed(() => response.value?.pins ?? [])

const isMapView = computed(() => state.value.view === 'map')
const isDesktop = useHydrationSafeMediaQuery('(min-width: 1200px)')
const shouldRenderMap = computed(() => isMapView.value || isDesktop.value)
const highlightedId = ref<string | null>(null)

const handleHighlight = (id: string | null) => {
  highlightedId.value = id
}

const isUnknownCategory = computed(() => !!state.value.category && !categoryName.value)
const isPageOutOfRange = computed(
  () => !!response.value && response.value.page > response.value.pageCount
)
const isNotFound = computed(() => isUnknownCategory.value || isPageOutOfRange.value)
const NOT_FOUND_ERROR = { statusCode: 404, statusMessage: 'Not Found' }

if (isNotFound.value) throw createError(NOT_FOUND_ERROR)

watch(isNotFound, (notFound) => {
  if (notFound) showError(NOT_FOUND_ERROR)
})

const isIndexable = computed(() => isIndexableSearch(state.value))

useSeoMeta({
  title,
  description: () => t('results.seo.description'),
  ogTitle: title,
  robots: () => (isIndexable.value ? undefined : 'noindex, follow'),
})

const handleRetry = () => refresh()

watch(
  response,
  (value) => {
    if (!value) return
    trackSearch({ query: state.value.q, category: state.value.category, resultsCount: value.total })
  },
  { immediate: true }
)
</script>

<template>
  <div class="search-page" :class="{ 'search-page--map': isMapView }">
    <SearchResultsHeader :title="title" :total="total" />
    <SearchToolbar :occasion="occasion" />
    <SearchFamilySavePrompt />
    <div class="search-page__layout">
      <div class="search-page__results">
        <SearchResultList
          :items="items"
          :is-loading="isLoading"
          :has-error="hasError"
          :highlighted-id="highlightedId"
          @retry="handleRetry"
          @highlight="handleHighlight"
        >
          <template #empty-actions>
            <UiButton :to="clearFiltersLink" variant="secondary">{{
              t('results.empty.clear')
            }}</UiButton>
          </template>
        </SearchResultList>
        <SearchPagination v-if="!isLoading && !hasError" :page="page" :page-count="pageCount" />
        <BusinessResultsCta v-if="!isLoading && !hasError" />
      </div>
      <div class="search-page__map">
        <ClientOnly>
          <LazySearchMap
            v-if="shouldRenderMap"
            :pins="pins"
            :highlighted-id="highlightedId"
            @highlight="handleHighlight"
          />
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  padding-block-end: var(--mp-section-gap);
}

.search-page__map {
  display: none;
}

.search-page--map .search-page__results {
  display: none;
}

.search-page--map .search-page__map {
  display: block;
  block-size: max(420px, calc(100dvh - 260px));
}

@media (min-width: 1200px) {
  .search-page__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 40%);
    gap: 24px;
    align-items: start;
  }

  .search-page--map .search-page__results,
  .search-page__map {
    display: block;
  }

  .search-page__map,
  .search-page--map .search-page__map {
    position: sticky;
    inset-block-start: 16px;
    block-size: calc(100dvh - 32px);
  }
}
</style>
