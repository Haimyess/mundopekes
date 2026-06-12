<script setup lang="ts">
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'
import { useI18nContent } from '~/composables/useI18nContent'

const wizard = useSuggestionWizard()
const { t } = useI18n()
const { tc } = useI18nContent()
const store = useActivitiesStore()

onMounted(async () => {
  if (!store.filterOptionsLoaded) await store.loadFilterOptions()
})

// ── Title ─────────────────────────────────────────────────────────
// Two-way binding that marks titleTouched when the user types
const titleValue = computed({
  get: () => wizard.effectiveTitle.value,
  set: (val: string) => {
    wizard.state.value.titleManual = val
    wizard.state.value.titleTouched = true
  },
})

// ── Seasons ───────────────────────────────────────────────────────
const seasonLabelMap = computed(() =>
  Object.fromEntries(store.filterOptions.seasons.map((s) => [s.value, t(s.label_key)]))
)

// ── Feature toggles (same keys as StepDetalles) ──────────────────
const TOGGLES = computed(() => [
  { key: 'stroller' as const, label: t('suggest.toggle_stroller'), icon: 'i-lucide-baby' },
  { key: 'shadow' as const, label: t('suggest.toggle_shadow'), icon: 'i-lucide-tree-pine' },
  { key: 'bathrooms' as const, label: t('suggest.toggle_bathrooms'), icon: 'i-lucide-toilet' },
  { key: 'weekends' as const, label: t('suggest.toggle_weekends'), icon: 'i-lucide-calendar' },
])

// ── Hours display ─────────────────────────────────────────────────
const firstOpeningHour = computed(() => {
  const text = wizard.state.value.placeInfo?.openingHoursText ?? ''
  return text.split('\n').find((l) => l.trim()) ?? ''
})
</script>

<template>
  <div class="step-resumen">
    <!-- ── TÍTULO ──────────────────────────────────────────────── -->
    <section class="step-resumen__section">
      <span class="step-resumen__label">{{ t('suggest.activity_title') }}</span>
      <input
        :value="titleValue"
        type="text"
        class="step-resumen__title-input"
        @input="titleValue = ($event.target as HTMLInputElement).value"
      />
    </section>

    <!-- ── LUGAR ──────────────────────────────────────────────── -->
    <section class="step-resumen__section">
      <span class="step-resumen__label">{{ t('suggest.step_lugar') }}</span>

      <div class="step-resumen__place-header">
        <span class="step-resumen__place-name">{{ wizard.placeName.value }}</span>
        <span class="step-resumen__place-addr">{{ wizard.placeAddress.value }}</span>
      </div>

      <UFormField :label="t('suggest.description')">
        <UTextarea
          v-model="wizard.state.value.description"
          :placeholder="t('suggest.description_placeholder')"
          :rows="2"
          class="w-full"
        />
      </UFormField>

      <div class="step-resumen__place-meta">
        <UFormField :label="t('suggest.phone')">
          <UiInput v-model="wizard.state.value.placeInfo.phone" icon="i-lucide-phone" />
        </UFormField>
        <UFormField :label="t('suggest.website')">
          <UiInput v-model="wizard.state.value.placeInfo.website" icon="i-lucide-globe" />
        </UFormField>
      </div>
    </section>

    <!-- ── ACTIVIDAD ──────────────────────────────────────────── -->
    <section class="step-resumen__section">
      <div class="step-resumen__section-header">
        <span class="step-resumen__label">{{ t('suggest.step_actividad') }}</span>
        <button class="step-resumen__edit-btn" @click="wizard.toggleEdit()">
          <UiIcon name="i-lucide-pencil" size="xs" />
          {{ t('common.edit') }}
        </button>
      </div>

      <div class="step-resumen__chips">
        <!-- Categoría -->
        <template v-if="wizard.state.value.selectedCategories.length">
          <UiBadge
            v-for="cat in wizard.state.value.selectedCategories"
            :key="cat.id"
            variant="success"
            size="sm"
          >
            {{ tc(cat.name_i18n) }}
          </UiBadge>
        </template>

        <!-- Actividad personalizada -->
        <UiBadge v-if="wizard.state.value.customActivity" variant="primary" size="sm">
          {{ wizard.state.value.customActivity }}
        </UiBadge>

        <!-- Temporadas -->
        <UiBadge
          v-for="sv in wizard.state.value.selectedSeasons"
          :key="sv"
          variant="info"
          size="sm"
        >
          {{ seasonLabelMap[sv] ?? sv }}
        </UiBadge>

        <!-- Edades -->
        <UiBadge
          v-for="label in wizard.state.value.selectedAgeLabels"
          :key="label"
          variant="secondary"
          size="sm"
        >
          {{ label }}
        </UiBadge>

        <span
          v-if="
            !wizard.state.value.selectedCategories.length &&
            !wizard.state.value.customActivity &&
            !wizard.state.value.selectedSeasons.length &&
            !wizard.state.value.selectedAgeLabels.length
          "
          class="step-resumen__empty"
        >
          {{ t('suggest.edit_empty') }}
        </span>
      </div>
    </section>

    <!-- ── DETALLES ────────────────────────────────────────────── -->
    <section class="step-resumen__section">
      <span class="step-resumen__label">{{ t('suggest.step_detalles') }}</span>

      <!-- Precio -->
      <div class="step-resumen__toggle-row">
        <div class="step-resumen__toggle-info">
          <UiIcon name="i-lucide-ticket" size="sm" />
          <span class="step-resumen__toggle-label">{{ t('suggest.free') }}</span>
        </div>
        <UCheckbox v-model="wizard.state.value.isFree" />
      </div>
      <Transition name="slide-down">
        <div v-if="!wizard.state.value.isFree" class="step-resumen__price">
          <UFormField :label="t('suggest.price')">
            <UiInput
              v-model="wizard.state.value.price"
              type="number"
              placeholder="45"
              icon="i-lucide-shekel-sign"
            />
          </UFormField>
        </div>
      </Transition>

      <!-- Características -->
      <div v-for="toggle in TOGGLES" :key="toggle.key" class="step-resumen__toggle-row">
        <div class="step-resumen__toggle-info">
          <UiIcon :name="toggle.icon" size="sm" />
          <span class="step-resumen__toggle-label">{{ toggle.label }}</span>
        </div>
        <UCheckbox v-model="wizard.state.value[toggle.key]" />
      </div>

      <!-- Horarios -->
      <div class="step-resumen__hours">
        <UiIcon name="i-lucide-clock" size="xs" />
        <span v-if="wizard.state.value.hoursUnknown" class="step-resumen__hours-pending">
          {{ t('suggest.hours_pending_review') }}
        </span>
        <span v-else-if="firstOpeningHour" class="step-resumen__hours-text">
          {{ firstOpeningHour }}
        </span>
        <span v-else class="step-resumen__hours-text">
          {{ t('suggest.schedule') }}
        </span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.step-resumen {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.step-resumen__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
  border-bottom: 0.5px solid var(--color-border-tertiary);
}

.step-resumen__section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.step-resumen__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Prominent title input */
.step-resumen__title-input {
  width: 100%;
  font-size: var(--font-size-lg, 1.125rem);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family-base);
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  border-bottom: 1.5px solid var(--color-border-secondary);
  border-radius: 0;
  padding: var(--space-1) 0;
  outline: none;
  transition: border-color 0.15s;
}

.step-resumen__title-input:focus {
  border-bottom-color: var(--color-secondary-500);
}

.step-resumen__place-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-resumen__place-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.step-resumen__place-addr {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.step-resumen__place-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.step-resumen__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.step-resumen__edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-secondary-600);
  background: var(--color-secondary-50);
  border: 0.5px solid var(--color-secondary-200);
  border-radius: 99px;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-family-base);
}

.step-resumen__edit-btn:hover {
  background: var(--color-secondary-100);
}

.step-resumen__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.step-resumen__empty {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.step-resumen__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-1) 0;
  border-bottom: 0.5px solid var(--color-border-tertiary);
}

.step-resumen__toggle-row:last-of-type {
  border-bottom: none;
}

.step-resumen__toggle-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
}

.step-resumen__toggle-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.step-resumen__price {
  padding-top: var(--space-1);
}

.step-resumen__hours {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding-top: var(--space-1);
}

.step-resumen__hours-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.step-resumen__hours-pending {
  font-size: var(--font-size-xs);
  color: var(--color-warning-600, #d97706);
  font-style: italic;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 80px;
}
</style>
