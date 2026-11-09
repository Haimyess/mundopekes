<script setup lang="ts">
const { t } = useI18n()
const { tc } = useI18nContent()
const route = useRoute()
const { getNavCategoriesWithChildren } = useCategories()

const { data: categories } = await useAsyncData(
  'layout-nav-categories',
  getNavCategoriesWithChildren,
  {
    default: () => [],
  }
)

const isSearchPage = computed(() => route.path === '/search')
const activeCategory = computed(() =>
  isSearchPage.value && typeof route.query.category === 'string' ? route.query.category : null
)
const isFreeActive = computed(() => isSearchPage.value && route.query.free === 'true')
const isAllActive = computed(
  () => isSearchPage.value && !activeCategory.value && !isFreeActive.value
)
</script>

<template>
  <nav class="category-nav" :aria-label="t('layout.categoriesNav')">
    <ul class="category-nav__list">
      <li>
        <UiChip to="/search" :selected="isAllActive">{{ t('layout.allCategories') }}</UiChip>
      </li>
      <li v-for="category in categories" :key="category.id">
        <UiChip
          :to="`/search?category=${category.slug}`"
          :selected="activeCategory === category.slug"
        >
          {{ tc(category.name_i18n) }}
        </UiChip>
      </li>
      <li>
        <UiChip to="/search?free=true" :selected="isFreeActive">{{ t('layout.free') }}</UiChip>
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
