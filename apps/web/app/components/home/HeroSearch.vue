<script setup lang="ts">
import type { SearchOccasion } from '#shared/types/search'

interface Props {
  occasion: SearchOccasion | null
}

defineProps<Props>()

interface QuickFilter {
  key: string
  icon: string
  query: Record<string, string>
}

const QUICK_FILTERS: readonly QuickFilter[] = [
  { key: 'rainy', icon: 'i-hugeicons-cloud-angled-rain', query: { category: 'indoor-juego' } },
  { key: 'hot', icon: 'i-hugeicons-sun-03', query: { category: 'agua-playas' } },
  { key: 'free', icon: 'i-hugeicons-ticket-01', query: { free: 'true' } },
  { key: 'outdoor', icon: 'i-hugeicons-tree-06', query: { category: 'aire-libre' } },
  { key: 'openNow', icon: 'i-hugeicons-clock-01', query: { open: 'now' } },
  { key: 'babies', icon: 'i-hugeicons-baby-02', query: { ages: '0' } },
]

const { t } = useI18n()
const { searchLink, searchLinkFor } = useSearchLink()
const { family } = useFamily()
const searchDraft = provideSearchDraft(family.value ?? {})

const quickFilters = computed(() =>
  QUICK_FILTERS.map(({ key, icon, query }) => ({
    key,
    icon,
    label: t(`home.quickFilters.${key}`),
    to: searchLink(query),
  }))
)

const handleSubmit = () => navigateTo(searchLinkFor(searchDraft.state.value))
</script>

<template>
  <section class="hero-search" aria-labelledby="hero-search-title">
    <h1 id="hero-search-title" class="hero-search__title">{{ t('home.title') }}</h1>
    <form
      class="hero-search__box"
      role="search"
      :aria-label="t('home.searchLabel')"
      @submit.prevent="handleSubmit"
    >
      <div class="hero-search__fields">
        <SearchWhereSheet />
        <SearchWhenSheet :occasion="occasion" />
        <SearchWhoSheet />
      </div>
      <UiButton type="submit" icon="i-hugeicons-search-01" class="hero-search__submit">
        {{ t('home.submit') }}
      </UiButton>
    </form>
    <nav class="hero-search__quick" :aria-label="t('home.quickFiltersLabel')">
      <ul class="hero-search__chips">
        <li v-for="filter in quickFilters" :key="filter.key">
          <UiChip :to="filter.to" :icon="filter.icon" size="sm">{{ filter.label }}</UiChip>
        </li>
      </ul>
    </nav>
  </section>
</template>

<style scoped>
.hero-search {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-block: 24px 8px;
}

.hero-search__title {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-h1);
  font-weight: var(--mp-fw-heavy);
  letter-spacing: var(--mp-ls-h1);
}

.hero-search__box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-panel);
  background: var(--mp-surface);
  box-shadow: 0 6px 24px rgb(0 0 0 / 8%);
}

.hero-search__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-search__chips {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-x: auto;
  scrollbar-width: none;
}

.hero-search__chips::-webkit-scrollbar {
  display: none;
}

@media (min-width: 1200px) {
  .hero-search__box {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
