<script setup lang="ts">
interface Props {
  counts: Record<string, number>
}

const props = defineProps<Props>()

const FALLBACK_ICON = 'i-hugeicons-grid-view'

const { t } = useI18n()
const { tc } = useI18nContent()
const { getNavCategoriesWithChildren } = useCategories()
const { searchLink } = useSearchLink()

const { data: categories } = await useAsyncData(
  'layout-nav-categories',
  getNavCategoriesWithChildren,
  { default: () => [] }
)

const tiles = computed(() =>
  categories.value.map((category) => ({
    slug: category.slug,
    name: tc(category.name_i18n),
    icon: category.icon ?? FALLBACK_ICON,
    count: props.counts[category.slug] ?? 0,
    to: searchLink({ category: category.slug }),
  }))
)
</script>

<template>
  <section class="category-grid" aria-labelledby="category-grid-title">
    <UiSectionHeader :title="t('home.categories')" heading-id="category-grid-title" />
    <ul class="category-grid__list">
      <li v-for="tile in tiles" :key="tile.slug">
        <NuxtLink :to="tile.to" class="category-grid__tile">
          <UiIcon :name="tile.icon" :size="32" />
          <span class="category-grid__name">{{ tile.name }}</span>
          <span class="category-grid__count">{{ t('results.count', tile.count) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.category-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-grid__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.category-grid__tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-card);
  color: var(--mp-ink);
  text-decoration: none;
}

.category-grid__tile:hover {
  border-color: var(--mp-ink);
}

.category-grid__tile:focus-visible {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}

.category-grid__name {
  font-weight: var(--mp-fw-bold);
}

.category-grid__count {
  color: var(--mp-text-2);
  font-size: var(--mp-fs-label-sm);
}

@media (min-width: 768px) {
  .category-grid__list {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
