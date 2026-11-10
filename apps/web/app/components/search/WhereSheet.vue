<script setup lang="ts">
import {
  DEFAULT_RADIUS_KM,
  ISRAEL_CITIES,
  SEARCH_RADII_KM,
  toPrivatePoint,
  type SearchRadiusKm,
  type Where,
} from '@mundopekes/core'

interface WhereDraft {
  where?: Where
  radius: SearchRadiusKm
}

const { t, locale } = useI18n()
const { whereLabel, cityName } = useSearchLabels()
const { isLocating, error: positionError, locate } = useCurrentPosition()

const isOpen = ref(false)
const { state, draft, apply } = useSearchSheet<WhereDraft>(isOpen, (current) => ({
  where: current.where,
  radius: (current.radius as SearchRadiusKm | undefined) ?? DEFAULT_RADIUS_KM,
}))

const groupName = useId()
const triggerValue = computed(() => whereLabel(state.value.where))
const isNearMe = computed(() => draft.value.where?.kind === 'point')

const selectedCity = computed({
  get: () => (draft.value.where?.kind === 'city' ? draft.value.where.slug : null),
  set: (slug: string | null) => {
    draft.value = { ...draft.value, where: slug ? { kind: 'city', slug } : undefined }
  },
})

const cityOptions = computed(() =>
  ISRAEL_CITIES.map(({ slug }) => ({ slug, label: cityName(slug) ?? slug })).sort((first, second) =>
    first.label.localeCompare(second.label, locale.value)
  )
)

const radiusOptions = computed(() =>
  SEARCH_RADII_KM.map((radius) => ({
    radius,
    label: new Intl.NumberFormat(locale.value, { style: 'unit', unit: 'kilometer' }).format(radius),
  }))
)

const positionErrorMessage = computed(() =>
  positionError.value ? t(`results.where.errors.${positionError.value}`) : null
)

const handleUseLocation = async () => {
  const point = await locate()
  if (point)
    draft.value = { ...draft.value, where: { kind: 'point', point: toPrivatePoint(point) } }
}
const handleRadiusSelect = (radius: SearchRadiusKm) => {
  draft.value = { ...draft.value, radius }
}
const handleClear = () => {
  draft.value = { where: undefined, radius: DEFAULT_RADIUS_KM }
}
const handleConfirm = () => {
  const { where, radius } = draft.value
  const isDistanceSortOrphaned = !where && state.value.sort === 'distance'
  return apply({
    where,
    radius: where && radius !== DEFAULT_RADIUS_KM ? radius : undefined,
    ...(isDistanceSortOrphaned ? { sort: undefined } : {}),
  })
}
</script>

<template>
  <UiSheet v-model:open="isOpen" :title="t('results.where.title')" :close-label="t('layout.close')">
    <template #trigger>
      <SearchSheetTrigger
        :label="t('results.toolbar.where')"
        :value="triggerValue"
        icon="i-hugeicons-location-01"
      />
    </template>
    <div class="where-sheet">
      <div class="where-sheet__near">
        <UiButton
          :variant="isNearMe ? 'primary' : 'secondary'"
          icon="i-hugeicons-gps-01"
          :loading="isLocating"
          :aria-pressed="String(isNearMe)"
          @click="handleUseLocation"
        >
          {{ isLocating ? t('results.where.locating') : t('results.where.useLocation') }}
        </UiButton>
        <p class="where-sheet__hint">{{ t('results.where.privacy') }}</p>
        <p v-if="positionErrorMessage" class="where-sheet__error" role="alert">
          {{ positionErrorMessage }}
        </p>
      </div>
      <fieldset class="where-sheet__group">
        <legend class="where-sheet__legend">{{ t('results.where.radius') }}</legend>
        <ul class="where-sheet__chips">
          <li v-for="option in radiusOptions" :key="option.radius">
            <UiChip
              :selected="draft.radius === option.radius"
              @toggle="handleRadiusSelect(option.radius)"
            >
              <span dir="ltr">{{ option.label }}</span>
            </UiChip>
          </li>
        </ul>
      </fieldset>
      <fieldset class="where-sheet__group">
        <legend class="where-sheet__legend">{{ t('results.where.cities') }}</legend>
        <label v-for="option in cityOptions" :key="option.slug" class="where-sheet__option">
          <span class="where-sheet__label">{{ option.label }}</span>
          <input
            v-model="selectedCity"
            class="where-sheet__radio"
            type="radio"
            :name="groupName"
            :value="option.slug"
          />
        </label>
      </fieldset>
    </div>
    <template #footer>
      <SearchSheetFooter
        :confirm-label="t('results.actions.done')"
        @clear="handleClear"
        @confirm="handleConfirm"
      />
    </template>
  </UiSheet>
</template>

<style scoped>
.where-sheet {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.where-sheet__near {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.where-sheet__hint,
.where-sheet__error {
  margin: 0;
  font-size: var(--mp-fs-label-sm);
}

.where-sheet__hint {
  color: var(--mp-text-2);
}

.where-sheet__error {
  color: var(--mp-coral-700);
}

.where-sheet__group {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  border: 0;
}

.where-sheet__legend {
  margin-block-end: 12px;
  padding: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body);
  font-weight: var(--mp-fw-bold);
}

.where-sheet__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.where-sheet__option {
  display: flex;
  align-items: center;
  gap: 12px;
  min-block-size: 48px;
  border-block-end: 1px solid var(--mp-border-soft);
  cursor: pointer;
}

.where-sheet__label {
  flex: 1;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body);
}

.where-sheet__option:has(:checked) .where-sheet__label {
  font-weight: var(--mp-fw-bold);
}

.where-sheet__radio {
  inline-size: 22px;
  block-size: 22px;
  margin: 0;
  accent-color: var(--mp-ink);
}

.where-sheet__radio:focus-visible {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}
</style>
