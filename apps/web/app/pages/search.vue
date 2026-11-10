<script setup lang="ts">
import type { CategoryWithChildren } from '~/composables/useCategories'

const { t } = useI18n()
const { tc } = useI18nContent()
const { trackSearch } = useTracking()
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

const hasPersonalCriteria = computed(
  () => !!(state.value.q || state.value.when || state.value.ages || state.value.sort)
)

useSeoMeta({
  title,
  description: () => t('results.seo.description'),
  robots: () => (hasPersonalCriteria.value || page.value > 1 ? 'noindex, follow' : undefined),
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
  <div class="search-page">
    <SearchResultsHeader :title="title" :total="total" />
    <SearchQuickChips :occasion="occasion" />
    <SearchResultList
      :items="items"
      :is-loading="isLoading"
      :has-error="hasError"
      @retry="handleRetry"
    >
      <template #empty-actions>
        <UiButton to="/search" variant="secondary">{{ t('results.empty.clear') }}</UiButton>
      </template>
    </SearchResultList>
    <SearchPagination v-if="!isLoading && !hasError" :page="page" :page-count="pageCount" />
  </div>
</template>

<style scoped>
.search-page {
  padding-block-end: var(--mp-section-gap);
}
</style>
