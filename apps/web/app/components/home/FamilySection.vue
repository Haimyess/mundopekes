<script setup lang="ts">
import type { SearchResponse } from '#shared/types/search'
import type { SearchState } from '~/utils/search-query'

interface Props {
  family: SearchState
  results: SearchResponse | null
}

const props = defineProps<Props>()

const emit = defineEmits<{ forget: [] }>()

const { t } = useI18n()
const router = useRouter()
const { whenLabel, whereLabel, agesLabel } = useSearchLabels()

const query = computed(() => toSearchQuery(props.family))
const searchLink = computed(
  () => router.resolve({ path: SEARCH_PATH, query: query.value }).fullPath
)
const summary = computed(() =>
  [
    agesLabel(props.family.ages),
    whereLabel(props.family.where),
    whenLabel(props.family.when, props.results?.occasion ?? null),
  ].filter((part): part is string => !!part)
)
const section = computed(() =>
  props.results
    ? { items: props.results.items, total: props.results.total, query: query.value }
    : null
)

const handleForget = () => emit('forget')
</script>

<template>
  <section class="family-section" aria-labelledby="family-section-title">
    <div class="family-section__header">
      <h2 id="family-section-title" class="family-section__title">{{ t('family.title') }}</h2>
      <ul v-if="summary.length" class="family-section__summary" :aria-label="t('family.summary')">
        <li v-for="part in summary" :key="part">{{ part }}</li>
      </ul>
      <div class="family-section__actions">
        <NuxtLink :to="searchLink" class="family-section__link">{{ t('family.edit') }}</NuxtLink>
        <button type="button" class="family-section__link" @click="handleForget">
          {{ t('family.forget') }}
        </button>
      </div>
    </div>
    <HomeCarouselSection
      v-if="section && section.items.length"
      :title="t('family.results')"
      :section="section"
    />
    <p v-else class="family-section__empty" role="status">{{ t('family.empty') }}</p>
  </section>
</template>

<style scoped>
.family-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: var(--mp-r-panel);
  background: var(--mp-coral-50);
}

.family-section__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.family-section__title {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-section-title);
  font-weight: var(--mp-fw-heavy);
  letter-spacing: var(--mp-ls-section-title);
}

.family-section__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.family-section__summary li {
  padding: 4px 10px;
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  color: var(--mp-ink);
  font-size: var(--mp-fs-body-sm);
}

.family-section__actions {
  display: flex;
  gap: 16px;
}

.family-section__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--mp-ink);
  font: inherit;
  font-size: var(--mp-fs-body-sm);
  font-weight: var(--mp-fw-semibold);
  text-decoration: underline;
  cursor: pointer;
}

.family-section__link:focus-visible {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}

.family-section__empty {
  margin: 0;
  color: var(--mp-text-2);
}
</style>
