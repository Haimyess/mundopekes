<script setup lang="ts">
import { SEARCH_SORTS, type SearchSort } from '@mundopekes/core'

const DEFAULT_SORT: SearchSort = 'recommended'

const { t } = useI18n()

const isOpen = ref(false)
const { state, draft, apply } = useSearchSheet<SearchSort>(
  isOpen,
  (current) => current.sort ?? DEFAULT_SORT
)

const hasAges = computed(() => !!state.value.ages?.length)
const groupName = useId()

const sortLabel = (sort: SearchSort) =>
  sort === DEFAULT_SORT && hasAges.value ? t('results.sort.ageFit') : t(`results.sort.${sort}`)

const options = computed(() => SEARCH_SORTS.map((sort) => ({ sort, label: sortLabel(sort) })))
const triggerValue = computed(() =>
  state.value.sort && state.value.sort !== DEFAULT_SORT ? sortLabel(state.value.sort) : undefined
)

const handleClear = () => {
  draft.value = DEFAULT_SORT
}
const handleConfirm = () => apply({ sort: draft.value === DEFAULT_SORT ? undefined : draft.value })
</script>

<template>
  <UiSheet v-model:open="isOpen" :title="t('results.sort.title')" :close-label="t('layout.close')">
    <template #trigger>
      <SearchSheetTrigger
        :label="t('results.toolbar.sort')"
        :value="triggerValue"
        icon="i-hugeicons-sorting-05"
      />
    </template>
    <fieldset class="sort-sheet">
      <legend class="sort-sheet__legend">{{ t('results.sort.title') }}</legend>
      <label v-for="option in options" :key="option.sort" class="sort-sheet__option">
        <span class="sort-sheet__label">{{ option.label }}</span>
        <input
          v-model="draft"
          class="sort-sheet__radio"
          type="radio"
          :name="groupName"
          :value="option.sort"
        />
      </label>
    </fieldset>
    <template #footer>
      <SearchSheetFooter
        :confirm-label="t('results.actions.apply')"
        @clear="handleClear"
        @confirm="handleConfirm"
      />
    </template>
  </UiSheet>
</template>

<style scoped>
.sort-sheet {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  border: 0;
}

.sort-sheet__legend {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.sort-sheet__option {
  display: flex;
  align-items: center;
  gap: 12px;
  min-block-size: 52px;
  border-block-end: 1px solid var(--mp-border-soft);
  cursor: pointer;
}

.sort-sheet__label {
  flex: 1;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body);
}

.sort-sheet__option:has(:checked) .sort-sheet__label {
  font-weight: var(--mp-fw-bold);
}

.sort-sheet__radio {
  inline-size: 22px;
  block-size: 22px;
  margin: 0;
  accent-color: var(--mp-ink);
}

.sort-sheet__radio:focus-visible {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}
</style>
