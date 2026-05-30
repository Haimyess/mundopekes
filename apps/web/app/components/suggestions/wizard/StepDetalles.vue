<script setup lang="ts">
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'
import type { WizardSchedule } from '~/composables/useSuggestionWizard'

const wizard = useSuggestionWizard()
const { t } = useI18n()

const DAYS = computed<{ key: keyof WizardSchedule; label: string }[]>(() => [
  { key: 'sunday', label: t('common.day_sunday') },
  { key: 'monday', label: t('common.day_monday') },
  { key: 'tuesday', label: t('common.day_tuesday') },
  { key: 'wednesday', label: t('common.day_wednesday') },
  { key: 'thursday', label: t('common.day_thursday') },
  { key: 'friday', label: t('common.day_friday') },
  { key: 'saturday', label: t('common.day_saturday') },
])

const TOGGLES = computed(() => [
  { key: 'stroller' as const, label: t('suggest.toggle_stroller'), icon: 'i-lucide-baby' },
  { key: 'shadow' as const, label: t('suggest.toggle_shadow'), icon: 'i-lucide-tree-pine' },
  { key: 'bathrooms' as const, label: t('suggest.toggle_bathrooms'), icon: 'i-lucide-toilet' },
  { key: 'weekends' as const, label: t('suggest.toggle_weekends'), icon: 'i-lucide-calendar' },
])

// Google hours exist when placeInfo.openingHoursText is non-empty
const googleHoursLines = computed(() => {
  const text = wizard.state.value.placeInfo?.openingHoursText ?? ''
  return text ? text.split('\n').filter(Boolean) : []
})

const hasGoogleHours = computed(() => googleHoursLines.value.length > 0)

// Starts hidden (show the Google hours by default when available)
const showManualEditor = ref(false)
</script>

<template>
  <div class="step-detalles">
    <!-- Precio -->
    <div class="step-detalles__section">
      <div class="step-detalles__toggle-row">
        <div class="step-detalles__toggle-info">
          <UiIcon name="i-lucide-ticket" size="sm" />
          <span class="step-detalles__toggle-label">{{ t('suggest.free') }}</span>
        </div>
        <UCheckbox v-model="wizard.state.value.isFree" />
      </div>
      <Transition name="slide-down">
        <div v-if="!wizard.state.value.isFree" class="step-detalles__price">
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
    </div>

    <!-- Características -->
    <div class="step-detalles__section">
      <div v-for="toggle in TOGGLES" :key="toggle.key" class="step-detalles__toggle-row">
        <div class="step-detalles__toggle-info">
          <UiIcon :name="toggle.icon" size="sm" />
          <span class="step-detalles__toggle-label">{{ toggle.label }}</span>
        </div>
        <UCheckbox v-model="wizard.state.value[toggle.key]" />
      </div>
    </div>

    <!-- Horarios -->
    <div class="step-detalles__section">
      <div class="step-detalles__schedule-header">
        <span class="step-detalles__section-label">{{ t('suggest.schedule') }}</span>
        <!-- Toggle "no sé los horarios" -->
        <div class="step-detalles__toggle-info step-detalles__toggle-info--inline">
          <span class="step-detalles__toggle-label step-detalles__toggle-label--sm">
            {{ t('suggest.hours_unknown') }}
          </span>
          <UCheckbox v-model="wizard.state.value.hoursUnknown" />
        </div>
      </div>

      <!-- Schedule content — hidden when hoursUnknown -->
      <template v-if="!wizard.state.value.hoursUnknown">
        <!-- Google hours: primary display -->
        <template v-if="hasGoogleHours && !showManualEditor">
          <div class="step-detalles__google-hours">
            <p
              v-for="(line, i) in googleHoursLines"
              :key="i"
              class="step-detalles__google-hours-line"
            >
              {{ line }}
            </p>
          </div>
          <button class="step-detalles__manual-link" @click="showManualEditor = true">
            {{ t('suggest.edit_hours_manually') }}
          </button>
        </template>

        <!-- Manual day-by-day editor (default when no Google hours, or when user requests it) -->
        <template v-else>
          <div v-if="hasGoogleHours" class="step-detalles__manual-back">
            <button class="step-detalles__manual-link" @click="showManualEditor = false">
              ← {{ t('suggest.opening_hours') }}
            </button>
          </div>
          <div class="step-detalles__schedule">
            <div v-for="day in DAYS" :key="day.key" class="step-detalles__day">
              <button
                class="step-detalles__day-dot"
                :class="{
                  'step-detalles__day-dot--active': wizard.state.value.schedule[day.key].open,
                }"
                @click="wizard.toggleDay(day.key)"
              />
              <span
                class="step-detalles__day-name"
                :class="{
                  'step-detalles__day-name--active': wizard.state.value.schedule[day.key].open,
                }"
              >
                {{ day.label }}
              </span>
              <input
                v-model="wizard.state.value.schedule[day.key].start"
                type="time"
                class="step-detalles__time-input"
                :class="{
                  'step-detalles__time-input--disabled': !wizard.state.value.schedule[day.key].open,
                }"
                :disabled="!wizard.state.value.schedule[day.key].open"
              />
              <span class="step-detalles__time-sep">–</span>
              <input
                v-model="wizard.state.value.schedule[day.key].end"
                type="time"
                class="step-detalles__time-input"
                :class="{
                  'step-detalles__time-input--disabled': !wizard.state.value.schedule[day.key].open,
                }"
                :disabled="!wizard.state.value.schedule[day.key].open"
              />
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.step-detalles {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.step-detalles__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.step-detalles__schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.step-detalles__section-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.step-detalles__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 0.5px solid var(--color-border-tertiary);
}

.step-detalles__toggle-row:last-child {
  border-bottom: none;
}

.step-detalles__toggle-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
}

.step-detalles__toggle-info--inline {
  gap: var(--space-2);
}

.step-detalles__toggle-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.step-detalles__toggle-label--sm {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.step-detalles__price {
  padding-top: var(--space-2);
}

.step-detalles__google-hours {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-background-secondary);
  border-radius: var(--border-radius-md);
  border: 0.5px solid var(--color-border-tertiary);
}

.step-detalles__google-hours-line {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
}

.step-detalles__manual-link {
  font-size: var(--font-size-xs);
  color: var(--color-secondary-600);
  text-decoration: underline;
  text-underline-offset: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: var(--font-family-base);
  align-self: flex-start;
  margin-top: var(--space-1);
}

.step-detalles__manual-link:hover {
  color: var(--color-secondary-700);
}

.step-detalles__manual-back {
  margin-bottom: var(--space-2);
}

.step-detalles__schedule {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.step-detalles__day {
  display: grid;
  grid-template-columns: 16px 80px 1fr auto 1fr;
  align-items: center;
  gap: var(--space-2);
}

.step-detalles__day-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border-secondary);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
  flex-shrink: 0;
}

.step-detalles__day-dot--active {
  background: var(--color-secondary-500);
  border-color: var(--color-secondary-500);
}

.step-detalles__day-name {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-medium);
  transition: color 0.15s;
}

.step-detalles__day-name--active {
  color: var(--color-text-primary);
}

.step-detalles__time-input {
  padding: 4px 6px;
  font-size: var(--font-size-xs);
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  outline: none;
  font-family: var(--font-sans);
  transition: all 0.15s;
  width: 100%;
}

.step-detalles__time-input:focus {
  border-color: var(--color-secondary-400);
}

.step-detalles__time-input--disabled {
  opacity: 0.35;
}

.step-detalles__time-sep {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-align: center;
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
