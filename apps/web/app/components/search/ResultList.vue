<script setup lang="ts">
import type { SearchResultItem } from '#shared/types/search'

interface Props {
  items: readonly SearchResultItem[]
  isLoading: boolean
  hasError: boolean
  highlightedId?: string | null
}

const props = withDefaults(defineProps<Props>(), { highlightedId: null })

const emit = defineEmits<{ retry: []; highlight: [id: string | null] }>()

const { t } = useI18n()

const SKELETON_COUNT = 8
const EAGER_IMAGE_COUNT = 2

const isEmpty = computed(() => !props.isLoading && !props.hasError && props.items.length === 0)

const handleRetry = () => emit('retry')
const handleHighlight = (id: string | null) => emit('highlight', id)
</script>

<template>
  <div class="result-list">
    <StateError
      v-if="hasError"
      :title="t('errors.generic.title')"
      :description="t('errors.generic.description')"
      :retry-label="t('errors.retry')"
      @retry="handleRetry"
    />
    <ul
      v-else-if="isLoading"
      class="result-list__grid"
      :aria-label="t('results.loading')"
      aria-busy="true"
    >
      <li v-for="index in SKELETON_COUNT" :key="index" class="result-list__skeleton">
        <UiSkeleton height="auto" class="result-list__skeleton-media" />
        <UiSkeleton variant="text" :lines="2" />
      </li>
    </ul>
    <StateEmpty
      v-else-if="isEmpty"
      :title="t('results.empty.title')"
      :description="t('results.empty.description')"
    >
      <slot name="empty-actions" />
    </StateEmpty>
    <ul v-else class="result-list__grid">
      <li
        v-for="(item, index) in items"
        :key="`${item.kind}-${item.id}`"
        class="result-list__item"
        :class="{ 'result-list__item--highlighted': item.id === highlightedId }"
        @mouseenter="handleHighlight(item.id)"
        @mouseleave="handleHighlight(null)"
        @focusin="handleHighlight(item.id)"
        @focusout="handleHighlight(null)"
      >
        <SearchResultCard :item="item" :is-eager="index < EAGER_IMAGE_COUNT" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.result-list__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.result-list__item {
  border-radius: var(--mp-r-card);
  outline: 2px solid transparent;
  outline-offset: 4px;
  transition: outline-color 0.15s ease;
}

.result-list__item--highlighted {
  outline-color: var(--mp-ink);
}

@media (prefers-reduced-motion: reduce) {
  .result-list__item {
    transition: none;
  }
}

.result-list__skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-list__skeleton-media {
  aspect-ratio: 1 / 1;
}

.result-list {
  container-type: inline-size;
}

@container (min-width: 560px) {
  .result-list__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container (min-width: 880px) {
  .result-list__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 28px 20px;
  }
}
</style>
