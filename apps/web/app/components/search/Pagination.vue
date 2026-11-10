<script setup lang="ts">
interface Props {
  page: number
  pageCount: number
}

const props = defineProps<Props>()

const { t } = useI18n()
const { linkTo } = useSearchState()

const hasPrevious = computed(() => props.page > 1)
const hasNext = computed(() => props.page < props.pageCount)
const previousLink = computed(() => linkTo({ page: props.page - 1 }))
const nextLink = computed(() => linkTo({ page: props.page + 1 }))
</script>

<template>
  <nav v-if="pageCount > 1" class="search-pagination" :aria-label="t('results.pagination.label')">
    <NuxtLink v-if="hasPrevious" :to="previousLink" class="search-pagination__link" rel="prev">
      <UiIcon name="i-hugeicons-arrow-left-01" :size="20" class="search-pagination__icon" />
      {{ t('results.pagination.previous') }}
    </NuxtLink>
    <p class="search-pagination__status" aria-current="page">
      {{ t('results.pagination.status', { page, pageCount }) }}
    </p>
    <NuxtLink v-if="hasNext" :to="nextLink" class="search-pagination__link" rel="next">
      {{ t('results.pagination.next') }}
      <UiIcon name="i-hugeicons-arrow-right-01" :size="20" class="search-pagination__icon" />
    </NuxtLink>
  </nav>
</template>

<style scoped>
.search-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-block: var(--mp-section-gap) 0;
}

.search-pagination__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-block-size: var(--mp-tap);
  padding-inline: 16px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
  color: var(--mp-ink);
  font-weight: var(--mp-fw-semibold);
  text-decoration: none;
}

.search-pagination__link:focus-visible {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}

.search-pagination__status {
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body-sm);
}

[dir='rtl'] .search-pagination__icon {
  transform: scaleX(-1);
}
</style>
