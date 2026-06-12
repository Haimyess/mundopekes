<script setup lang="ts">
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'
import { useI18nContent } from '~/composables/useI18nContent'

const props = defineProps<{ currentStep: number; onEdit: () => void }>()
const wizard = useSuggestionWizard()
const { t } = useI18n()
const { tc } = useI18nContent()
const store = useActivitiesStore()

const expanded = ref(false)

// value → translated label, for converting stored season values to display text
const seasonLabelMap = computed(() =>
  Object.fromEntries(store.filterOptions.seasons.map((s) => [s.value, t(s.label_key)]))
)

const badges = computed(() => {
  const s = wizard.state.value
  if (!s) return []

  const out: {
    label: string
    color: 'success' | 'info' | 'primary' | 'warning' | 'error' | 'secondary'
  }[] = []

  if (s.selectedCategories?.length)
    out.push({ label: tc(s.selectedCategories[0]!.name_i18n), color: 'success' })

  s.selectedSeasons?.forEach((sv) =>
    out.push({ label: seasonLabelMap.value[sv] ?? sv, color: 'info' })
  )

  s.selectedAgeLabels?.forEach((label) => out.push({ label, color: 'secondary' }))

  if (props.currentStep >= 3) {
    if (s.isFree) out.push({ label: t('suggest.free'), color: 'success' })
    else if (s.price) out.push({ label: `₪${s.price}`, color: 'primary' })
    if (s.stroller) out.push({ label: t('suggest.toggle_stroller'), color: 'info' })
    if (s.shadow) out.push({ label: t('suggest.toggle_shadow'), color: 'success' })
    if (s.bathrooms) out.push({ label: t('suggest.toggle_bathrooms'), color: 'success' })
    if (s.weekends) out.push({ label: t('suggest.toggle_weekends'), color: 'success' })
  }

  return out
})

// Whether there is any extra place info to show when expanded
const hasExtra = computed(() => {
  const pi = wizard.state.value.placeInfo
  return !!(pi?.phone || pi?.website || pi?.openingHoursText || wizard.state.value.description)
})

const descriptionExcerpt = computed(() => {
  const desc = wizard.state.value.description || tc(wizard.state.value.description_i18n)
  if (!desc) return ''
  return desc.length > 120 ? desc.slice(0, 117) + '…' : desc
})

const firstOpeningHour = computed(() => {
  const text = wizard.state.value.placeInfo?.openingHoursText
  if (!text) return ''
  return text.split('\n').find((l) => l.trim()) ?? ''
})
</script>

<template>
  <div v-if="wizard.hasPlace.value" class="resumen-bar">
    <!-- Collapsed core: always visible, height-capped -->
    <div class="resumen-bar__core">
      <div class="resumen-bar__photo">
        <img
          v-if="wizard.placePhoto.value"
          :src="wizard.placePhoto.value"
          :alt="wizard.placeName.value"
          class="resumen-bar__img"
        />
        <div v-else class="resumen-bar__img-placeholder">
          <UiIcon name="i-lucide-map-pin" size="sm" />
        </div>
      </div>

      <div class="resumen-bar__content">
        <span class="resumen-bar__name">{{ wizard.placeName.value }}</span>
        <span class="resumen-bar__addr">{{ wizard.placeAddress.value }}</span>
        <div v-if="badges.length" class="resumen-bar__badges">
          <UiBadge v-for="(badge, i) in badges" :key="i" :variant="badge.color" size="xs">
            {{ badge.label }}
          </UiBadge>
        </div>
      </div>

      <div class="resumen-bar__side">
        <button v-if="currentStep > 1" class="resumen-bar__edit" @click.stop="onEdit">
          <UiIcon name="i-lucide-pencil" size="xs" />
          {{ t('common.edit') }}
        </button>
        <button
          v-if="hasExtra"
          class="resumen-bar__expand"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          <UiIcon :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" size="xs" />
          {{ expanded ? t('suggest.show_less') : t('suggest.show_more') }}
        </button>
      </div>
    </div>

    <!-- Expanded extra: description excerpt + place info -->
    <div v-if="expanded && hasExtra" class="resumen-bar__extra">
      <p v-if="descriptionExcerpt" class="resumen-bar__extra-desc">
        {{ descriptionExcerpt }}
      </p>
      <div class="resumen-bar__extra-meta">
        <span v-if="wizard.state.value.placeInfo?.phone" class="resumen-bar__extra-item">
          <UiIcon name="i-lucide-phone" size="xs" />
          {{ wizard.state.value.placeInfo.phone }}
        </span>
        <a
          v-if="wizard.state.value.placeInfo?.website"
          :href="wizard.state.value.placeInfo.website"
          target="_blank"
          rel="noopener noreferrer"
          class="resumen-bar__extra-item resumen-bar__extra-link"
        >
          <UiIcon name="i-lucide-globe" size="xs" />
          {{ wizard.state.value.placeInfo.website }}
        </a>
        <span v-if="firstOpeningHour" class="resumen-bar__extra-item">
          <UiIcon name="i-lucide-clock" size="xs" />
          {{ firstOpeningHour }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resumen-bar {
  display: flex;
  flex-direction: column;
  background: var(--color-background-secondary);
  border-bottom: 0.5px solid var(--color-border-tertiary);
}

.resumen-bar:hover {
  background: var(--color-background-tertiary);
}

/* Collapsed top row — capped so the bar doesn't exceed ~1/5 of modal height */
.resumen-bar__core {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  max-height: 116px;
  overflow: hidden;
}

@media (max-width: 767px) {
  .resumen-bar__core {
    max-height: calc(92vh / 5);
  }
}

.resumen-bar__photo {
  width: 44px;
  height: 44px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
}

.resumen-bar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.resumen-bar__img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}

.resumen-bar__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.resumen-bar__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resumen-bar__addr {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resumen-bar__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-block-start: var(--space-1);
}

/* Side column: edit button + expand toggle stacked */
.resumen-bar__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
  flex-shrink: 0;
}

.resumen-bar__edit {
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
  white-space: nowrap;
  transition: all 0.15s;
}

.resumen-bar__edit:hover {
  background: var(--color-secondary-100);
}

.resumen-bar__expand {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  font-family: var(--font-family-base);
  white-space: nowrap;
}

.resumen-bar__expand:hover {
  color: var(--color-text-secondary);
}

/* Expanded extra section */
.resumen-bar__extra {
  padding: var(--space-2) var(--space-4) var(--space-3);
  border-top: 0.5px solid var(--color-border-tertiary);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 200px;
  overflow-y: auto;
}

.resumen-bar__extra-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
}

.resumen-bar__extra-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.resumen-bar__extra-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resumen-bar__extra-link {
  color: var(--color-secondary-600);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.resumen-bar__extra-link:hover {
  color: var(--color-secondary-700);
}
</style>
