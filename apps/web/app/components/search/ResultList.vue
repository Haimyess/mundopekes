<script setup lang="ts">
import type { SearchResultItem } from '#shared/types/search'

interface Props {
  items: readonly SearchResultItem[]
  isLoading: boolean
  hasError: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()

const SKELETON_COUNT = 8
const EAGER_IMAGE_COUNT = 2

const isEmpty = computed(() => !props.isLoading && !props.hasError && props.items.length === 0)

const handleRetry = () => emit('retry')
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
      <li v-for="(item, index) in items" :key="`${item.kind}-${item.id}`">
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

.result-list__skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-list__skeleton-media {
  aspect-ratio: 1 / 1;
}

@media (min-width: 768px) {
  .result-list__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .result-list__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 28px 20px;
  }
}
</style>
