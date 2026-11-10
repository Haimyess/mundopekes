<script setup lang="ts">
import { useElementVisibility, useMounted } from '@vueuse/core'
import type { SearchOccasion } from '#shared/types/search'

interface Props {
  occasion: SearchOccasion | null
}

defineProps<Props>()

const { t } = useI18n()
const { state } = useSearchState()
const { activeFilterCount } = useSearchLabels()
const { hasDecided: hasCookieChoice } = useCookieConsent()

const toolbar = useTemplateRef<HTMLElement>('toolbar')
const isToolbarVisible = useElementVisibility(toolbar)
const isMounted = useMounted()
const isFiltersOpen = ref(false)

const activeCount = computed(() => activeFilterCount(state.value))
const isFloatingVisible = computed(
  () => isMounted.value && hasCookieChoice.value && !isToolbarVisible.value && !isFiltersOpen.value
)

const handleOpenFilters = () => {
  isFiltersOpen.value = true
}
</script>

<template>
  <div ref="toolbar" class="search-toolbar" role="group" :aria-label="t('results.toolbar.label')">
    <SearchWhenSheet :occasion="occasion" />
    <SearchWhoSheet />
    <SearchFiltersSheet v-model:open="isFiltersOpen" />
    <SearchSortSheet />
  </div>
  <button
    v-if="isFloatingVisible"
    type="button"
    class="search-toolbar__floating"
    @click="handleOpenFilters"
  >
    <UiIcon name="i-hugeicons-filter-horizontal" :size="16" />
    {{ t('results.toolbar.filters') }}
    <span v-if="activeCount" class="search-toolbar__floating-count" dir="ltr">{{
      activeCount
    }}</span>
  </button>
</template>

<style scoped>
.search-toolbar {
  display: flex;
  gap: 8px;
  margin-inline: calc(var(--mp-gutter) * -1);
  padding: 0 var(--mp-gutter) 16px;
  overflow-x: auto;
  scrollbar-width: none;
}

.search-toolbar::-webkit-scrollbar {
  display: none;
}

.search-toolbar__floating {
  position: fixed;
  z-index: 40;
  inset-block-end: calc(16px + env(safe-area-inset-bottom));
  inset-inline-start: 50%;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-block-size: var(--mp-tap);
  padding-inline: 18px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  color: var(--mp-ink);
  font: inherit;
  font-weight: var(--mp-fw-semibold);
  box-shadow: 0 6px 20px rgb(0 0 0 / 12%);
  transform: translateX(-50%);
  cursor: pointer;
}

[dir='rtl'] .search-toolbar__floating {
  transform: translateX(50%);
}

.search-toolbar__floating:focus-visible {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}

.search-toolbar__floating-count {
  display: inline-grid;
  place-items: center;
  min-inline-size: 20px;
  block-size: 20px;
  padding-inline: 6px;
  border-radius: var(--mp-r-pill);
  background: var(--mp-ink);
  color: var(--mp-surface);
  font-size: var(--mp-fs-label-sm);
}

@media (min-width: 1200px) {
  .search-toolbar {
    margin-inline: 0;
    padding-inline: 0;
    flex-wrap: wrap;
  }
}
</style>
