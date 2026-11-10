<script setup lang="ts">
import {
  SEARCH_AMENITIES,
  SEARCH_DISCOUNTS,
  SEARCH_KINDS,
  SEARCH_PRICE_BANDS,
  type SearchAmenity,
  type SearchDiscount,
  type SearchKind,
  type SearchPriceBand,
} from '@mundopekes/core'
import type { SearchState } from '~/utils/search-query'

type FilterDraft = Pick<SearchState, 'kind' | 'free' | 'price' | 'open'> & {
  amenities: SearchAmenity[]
  discounts: SearchDiscount[]
}

type ListKey = 'amenities' | 'discounts'

const EMPTY_DRAFT: FilterDraft = {
  kind: undefined,
  free: undefined,
  price: undefined,
  open: undefined,
  amenities: [],
  discounts: [],
}

const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { activeFilterCount } = useSearchLabels()

const { state, draft, apply } = useSearchSheet<FilterDraft>(isOpen, (current) => ({
  kind: current.kind,
  free: current.free,
  price: current.price,
  open: current.open,
  amenities: [...(current.amenities ?? [])],
  discounts: [...(current.discounts ?? [])],
}))

const draftState = computed<SearchState>(() => ({
  ...state.value,
  ...draft.value,
  amenities: draft.value.amenities.length ? draft.value.amenities : undefined,
  discounts: draft.value.discounts.length ? draft.value.discounts : undefined,
}))

const { preview, isLoading } = useSearchPreview(isOpen, draftState)

const activeCount = computed(() => activeFilterCount(state.value))
const confirmLabel = computed(() =>
  preview.value ? t('results.filters.show', preview.value.total) : t('results.actions.apply')
)
const matchesLabel = (count: number | undefined) =>
  count === undefined ? undefined : t('results.filters.matches', count)

const kindOptions = computed(() => [
  { key: 'all', label: t('results.filters.kindAll'), value: undefined, count: undefined },
  ...SEARCH_KINDS.map((kind) => ({
    key: kind,
    label: t(`results.filters.kinds.${kind}`),
    value: kind,
    count: preview.value?.facets.kinds[kind],
  })),
])

const priceBandOptions = computed(() =>
  SEARCH_PRICE_BANDS.map((priceBand) => ({
    priceBand,
    label: t(`results.filters.priceBands.${priceBand}`),
    count: preview.value?.facets.priceBands[priceBand],
  }))
)

const amenityOptions = computed(() =>
  SEARCH_AMENITIES.map((value) => ({
    value,
    label: t(`results.filters.amenities.${value}`),
    description: matchesLabel(preview.value?.facets.amenities[value]),
  }))
)

const discountOptions = computed(() =>
  SEARCH_DISCOUNTS.map((value) => ({
    value,
    label: t(`results.filters.discounts.${value}`),
    description: matchesLabel(preview.value?.facets.discounts[value]),
  }))
)

const isOpenNow = computed({
  get: () => draft.value.open === 'now',
  set: (value: boolean) => {
    draft.value = { ...draft.value, open: value ? 'now' : undefined }
  },
})

const isInList = (key: ListKey, value: string) =>
  (draft.value[key] as readonly string[]).includes(value)

const handleListChange = (key: ListKey, value: string, isSelected: boolean) => {
  const others = (draft.value[key] as string[]).filter((current) => current !== value)
  draft.value = { ...draft.value, [key]: isSelected ? [...others, value] : others }
}
const handleKindSelect = (kind: SearchKind | undefined) => {
  draft.value = { ...draft.value, kind }
}
const handleFreeToggle = (isSelected: boolean) => {
  draft.value = { ...draft.value, free: isSelected || undefined }
}
const handlePriceBandToggle = (priceBand: SearchPriceBand, isSelected: boolean) => {
  draft.value = { ...draft.value, price: isSelected ? priceBand : undefined }
}
const handleClear = () => {
  draft.value = { ...EMPTY_DRAFT, amenities: [], discounts: [] }
}
const handleConfirm = () =>
  apply({
    kind: draftState.value.kind,
    free: draftState.value.free,
    price: draftState.value.price,
    open: draftState.value.open,
    amenities: draftState.value.amenities,
    discounts: draftState.value.discounts,
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
        <ul class="filters-sheet__chips">
          <li>
            <UiChip :selected="draft.free === true" @toggle="handleFreeToggle">
              {{ t('results.filters.freeOnly') }}
            </UiChip>
          </li>
          <li v-for="option in priceBandOptions" :key="option.priceBand">
            <UiChip
              :selected="draft.price === option.priceBand"
              :count="option.count"
              @toggle="handlePriceBandToggle(option.priceBand, $event)"
            >
              <span dir="ltr">{{ option.label }}</span>
            </UiChip>
          </li>
        </ul>
      </fieldset>
      <fieldset class="filters-sheet__group">
        <legend class="filters-sheet__legend">{{ t('results.filters.facilities') }}</legend>
        <UiSwitch
          v-for="option in amenityOptions"
          :key="option.value"
          :model-value="isInList('amenities', option.value)"
          :label="option.label"
          :description="option.description"
          @update:model-value="handleListChange('amenities', option.value, $event)"
        />
      </fieldset>
      <fieldset class="filters-sheet__group">
        <legend class="filters-sheet__legend">{{ t('results.filters.discountsTitle') }}</legend>
        <UiSwitch
          v-for="option in discountOptions"
          :key="option.value"
          :model-value="isInList('discounts', option.value)"
          :label="option.label"
          :description="option.description"
          @update:model-value="handleListChange('discounts', option.value, $event)"
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
