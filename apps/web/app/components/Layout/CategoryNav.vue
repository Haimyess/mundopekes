<script setup lang="ts">
import { useMounted } from '@vueuse/core'
import type { SearchResponse } from '#shared/types/search'

const { t } = useI18n()
const { tc } = useI18nContent()
const { getNavCategoriesWithChildren } = useCategories()
const { state, isSearchPage, linkTo } = useSearchState()
const { data: searchResults } = useNuxtData<SearchResponse>(SEARCH_RESULTS_KEY)
const isMounted = useMounted()

const { data: categories } = await useAsyncData(
  'layout-nav-categories',
  getNavCategoriesWithChildren,
  {
    default: () => [],
  }
)

const visibleFacets = computed(() =>
  isSearchPage.value && isMounted.value ? (searchResults.value?.facets ?? null) : null
)
const activeCategory = computed(() => state.value.category ?? null)
const isFreeActive = computed(() => state.value.free === true)
const isAllActive = computed(() => isSearchPage.value && !activeCategory.value)

const allLink = computed(() => linkTo({ category: undefined }))
const freeLink = computed(() => linkTo({ free: isFreeActive.value ? undefined : true }))

const categoryLink = (slug: string) =>
  linkTo({ category: activeCategory.value === slug ? undefined : slug })
const categoryCount = (slug: string) =>
  visibleFacets.value ? (visibleFacets.value.categories[slug] ?? 0) : undefined
</script>

<template>
  <nav class="category-nav" :aria-label="t('layout.categoriesNav')">
    <ul class="category-nav__list">
      <li>
        <UiChip :to="allLink" :selected="isAllActive" :count="visibleFacets?.total">
          {{ t('layout.allCategories') }}
        </UiChip>
      </li>
      <li v-for="category in categories" :key="category.id">
        <UiChip
          :to="categoryLink(category.slug)"
          :selected="activeCategory === category.slug"
          :count="categoryCount(category.slug)"
        >
          {{ tc(category.name_i18n) }}
        </UiChip>
      </li>
      <li>
        <UiChip :to="freeLink" :selected="isFreeActive">{{ t('layout.free') }}</UiChip>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.category-nav__list {
  display: flex;
  gap: 8px;
  margin: 0;
  padding-block: 4px 12px;
  padding-inline: var(--mp-gutter);
  list-style: none;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-nav__list::-webkit-scrollbar {
  display: none;
}

@media (min-width: 1200px) {
  .category-nav__list {
    max-inline-size: var(--mp-container);
    margin-inline: auto;
    padding-inline: 0;
    flex-wrap: wrap;
  }
}
</style>
