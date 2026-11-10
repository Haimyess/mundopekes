<script setup lang="ts">
import {
  SEARCH_AMENITIES,
  SEARCH_KINDS,
  type SearchAmenity,
  type SearchKind,
} from '@mundopekes/core'
import type { SearchState } from '~/utils/search-query'

type FilterDraft = Pick<SearchState, 'kind' | 'free' | 'open'> & { amenities: SearchAmenity[] }

const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { activeFilterCount } = useSearchLabels()

const { state, draft, apply } = useSearchSheet<FilterDraft>(isOpen, (current) => ({
  kind: current.kind,
  free: current.free,
  open: current.open,
  amenities: [...(current.amenities ?? [])],
}))

const draftState = computed<SearchState>(() => ({
  ...state.value,
  ...draft.value,
  amenities: draft.value.amenities.length ? draft.value.amenities : undefined,
}))

const { preview, isLoading } = useSearchPreview(isOpen, draftState)

const activeCount = computed(() => activeFilterCount(state.value))
const confirmLabel = computed(() =>
  preview.value ? t('results.filters.show', preview.value.total) : t('results.actions.apply')
)

const kindOptions = computed(() => [
  { key: 'all', label: t('results.filters.kindAll'), value: undefined, count: undefined },
  ...SEARCH_KINDS.map((kind) => ({
    key: kind,
    label: t(`results.filters.kinds.${kind}`),
    value: kind,
    count: preview.value?.facets.kinds[kind],
  })),
])

const amenityOptions = computed(() =>
  SEARCH_AMENITIES.map((amenity) => ({
    amenity,
    label: t(`results.filters.amenities.${amenity}`),
    count: preview.value?.facets.amenities[amenity],
  }))
)

const isFree = computed({
  get: () => draft.value.free === true,
  set: (value: boolean) => {
    draft.value = { ...draft.value, free: value || undefined }
  },
})

const isOpenNow = computed({
  get: () => draft.value.open === 'now',
  set: (value: boolean) => {
    draft.value = { ...draft.value, open: value ? 'now' : undefined }
  },
})

const hasAmenity = (amenity: SearchAmenity) => draft.value.amenities.includes(amenity)

const handleKindSelect = (kind: SearchKind | undefined) => {
  draft.value = { ...draft.value, kind }
}
const handleAmenityChange = (amenity: SearchAmenity, isSelected: boolean) => {
  const others = draft.value.amenities.filter((current) => current !== amenity)
  draft.value = { ...draft.value, amenities: isSelected ? [...others, amenity] : others }
}
const handleClear = () => {
  draft.value = { kind: undefined, free: undefined, open: undefined, amenities: [] }
}
const handleConfirm = () =>
  apply({
    kind: draftState.value.kind,
    free: draftState.value.free,
    open: draftState.value.open,
    amenities: draftState.value.amenities,
  })
</script>

<template>
  <UiSheet
    v-model:open="isOpen"
    :title="t('results.filters.title')"
    :close-label="t('layout.close')"
  >
    <template #trigger>
      <SearchSheetTrigger
        :label="t('results.toolbar.filters')"
        :count="activeCount"
        icon="i-hugeicons-filter-horizontal"
      />
    </template>
    <div class="filters-sheet">
      <fieldset class="filters-sheet__group">
        <legend class="filters-sheet__legend">{{ t('results.filters.kind') }}</legend>
        <ul class="filters-sheet__chips">
          <li v-for="option in kindOptions" :key="option.key">
            <UiChip
              :selected="draft.kind === option.value"
              :count="option.count"
              @toggle="handleKindSelect(option.value)"
            >
              {{ option.label }}
            </UiChip>
          </li>
        </ul>
      </fieldset>
      <fieldset class="filters-sheet__group">
        <legend class="filters-sheet__legend">{{ t('results.filters.price') }}</legend>
        <UiSwitch v-model="isFree" :label="t('results.filters.freeOnly')" />
      </fieldset>
      <fieldset class="filters-sheet__group">
        <legend class="filters-sheet__legend">{{ t('results.filters.facilities') }}</legend>
        <UiSwitch
          v-for="option in amenityOptions"
          :key="option.amenity"
          :model-value="hasAmenity(option.amenity)"
          :label="option.label"
          :description="
            option.count === undefined ? undefined : t('results.filters.matches', option.count)
          "
          @update:model-value="handleAmenityChange(option.amenity, $event)"
        />
      </fieldset>
      <fieldset class="filters-sheet__group">
        <legend class="filters-sheet__legend">{{ t('results.filters.hours') }}</legend>
        <UiSwitch v-model="isOpenNow" :label="t('results.filters.openNow')" />
      </fieldset>
    </div>
    <template #footer>
      <SearchSheetFooter
        :confirm-label="confirmLabel"
        :is-confirm-loading="isLoading"
        @clear="handleClear"
        @confirm="handleConfirm"
      />
    </template>
  </UiSheet>
</template>

<style scoped>
.filters-sheet {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.filters-sheet__group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
}

.filters-sheet__legend {
  margin-block-end: 12px;
  padding: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body);
  font-weight: var(--mp-fw-bold);
}

.filters-sheet__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
