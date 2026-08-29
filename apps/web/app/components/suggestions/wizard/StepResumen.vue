<script setup lang="ts">
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'
import { useI18nContent } from '~/composables/useI18nContent'

const wizard = useSuggestionWizard()
const { t } = useI18n()
const { tc } = useI18nContent()
const store = useActivitiesStore()

const emit = defineEmits<{ 'edit-activities': [] }>()

const seasonLabelMap = computed(() =>
  Object.fromEntries(store.filterOptions.seasons.map((s) => [s.value, t(s.label_key)]))
)

const activitySummary = (a: (typeof wizard.state.value.activities)[number]) => {
  if (a.mode === 'existing') return a.title
  return wizard.effectiveDraftTitle(a) || t('suggest.activity_untitled')
}

const activityBadges = (a: (typeof wizard.state.value.activities)[number]) => {
  if (a.mode === 'existing') return []
  const out: string[] = []
  if (a.category) out.push(tc(a.category.name_i18n))
  if (a.customActivity) out.push(a.customActivity)
  a.selectedSeasons.forEach((sv) => out.push(seasonLabelMap.value[sv] ?? sv))
  a.selectedAgeLabels.forEach((l) => out.push(l))
  out.push(a.isFree ? t('suggest.free') : `₪${a.price}`)
  return out
}
</script>

<template>
  <div class="step-resumen">
    <!-- ── LUGAR ──────────────────────────────────────────────── -->
    <section class="step-resumen__section">
      <span class="step-resumen__label">{{ t('suggest.step_lugar') }}</span>

      <div v-if="wizard.state.value.matchedPlace" class="step-resumen__place-header">
        <span class="step-resumen__place-name">{{ wizard.placeName.value }}</span>
        <span class="step-resumen__place-addr">{{ wizard.placeAddress.value }}</span>
        <span class="step-resumen__place-existing">
          <UiIcon name="i-lucide-check-circle" size="xs" />
          {{ t('suggest.existing_place') }}
        </span>
      </div>

      <template v-else>
        <div class="step-resumen__place-header">
          <span class="step-resumen__place-name">{{ wizard.placeName.value }}</span>
          <span class="step-resumen__place-addr">{{ wizard.placeAddress.value }}</span>
          <span class="step-resumen__place-new">
            <UiIcon name="i-lucide-sparkles" size="xs" />
            {{ t('suggest.new_place') }}
          </span>
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
      </template>
    </section>

    <!-- ── ACTIVIDADES ────────────────────────────────────────── -->
    <section class="step-resumen__section">
      <div class="step-resumen__section-header">
        <span class="step-resumen__label">{{ t('suggest.step_actividad') }}</span>
        <button class="step-resumen__edit-btn" @click="emit('edit-activities')">
          <UiIcon name="i-lucide-pencil" size="xs" />
          {{ t('common.edit') }}
        </button>
      </div>

      <div v-if="!wizard.state.value.activities.length" class="step-resumen__empty">
        {{ t('suggest.edit_empty') }}
      </div>

      <div
        v-for="a in wizard.state.value.activities"
        :key="a.localId"
        class="step-resumen__activity"
      >
        <div class="step-resumen__activity-head">
          <span class="step-resumen__activity-title">{{ activitySummary(a) }}</span>
          <span
            class="step-resumen__activity-tag"
            :class="{ 'step-resumen__activity-tag--existing': a.mode === 'existing' }"
          >
            {{ a.mode === 'existing' ? t('suggest.existing_activity') : t('suggest.new_activity') }}
          </span>
        </div>
        <div v-if="activityBadges(a).length" class="step-resumen__chips">
          <UiBadge v-for="(b, i) in activityBadges(a)" :key="i" variant="secondary" size="sm">
            {{ b }}
          </UiBadge>
        </div>
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

.step-resumen__place-existing,
.step-resumen__place-new {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  margin-top: 2px;
}

.step-resumen__place-existing {
  color: var(--color-success-700, #15803d);
}

.step-resumen__place-new {
  color: var(--color-primary-700, #1d4ed8);
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

.step-resumen__empty {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.step-resumen__activity {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) 0;
  border-bottom: 0.5px solid var(--color-border-tertiary);
}

.step-resumen__activity:last-child {
  border-bottom: none;
}

.step-resumen__activity-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.step-resumen__activity-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.step-resumen__activity-tag {
  font-size: var(--font-size-xs);
  color: var(--color-primary-700, #1d4ed8);
  white-space: nowrap;
}

.step-resumen__activity-tag--existing {
  color: var(--color-success-700, #15803d);
}

.step-resumen__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
</style>
