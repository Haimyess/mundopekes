<script setup lang="ts">
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'

const props  = defineProps<{ currentStep: number; onEdit: () => void }>()
const wizard = useSuggestionWizard()
const { t }  = useI18n()

const badges = computed(() => {
  const s = wizard.state.value
  if (!s) return []

  const out: { label: string; color: 'success' | 'info' | 'primary' | 'warning' | 'error' | 'secondary' }[] = []

  if (s.selectedCategories?.length)
    out.push({ label: s.selectedCategories[0]!.name, color: 'success' })

  s.selectedSeasons?.forEach(season =>
    out.push({ label: season, color: 'info' })
  )

  s.selectedAgeLabels?.forEach(label =>
    out.push({ label, color: 'secondary' })
  )

  if (props.currentStep >= 3) {
    if (s.isFree)
      out.push({ label: 'Gratuito', color: 'success' })
    else if (s.price)
      out.push({ label: `₪${s.price}`, color: 'primary' })
    if (s.stroller)
      out.push({ label: 'Cochecitos', color: 'info' })
    if (s.shadow)
      out.push({ label: 'Sombra', color: 'success' })
    if (s.bathrooms)
      out.push({ label: 'Baños', color: 'success' })
    if (s.weekends)
      out.push({ label: 'Fines de semana', color: 'success' })
  }

  return out
})
</script>

<template>
  <div v-if="wizard.hasPlace.value" class="resumen-bar" >
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
        <UiBadge
          v-for="(badge, i) in badges"
          :key="i"
          :variant="badge.color"
          size="xs"
        >
          {{ badge.label }}
        </UiBadge>
      </div>
    </div>

    <button
      v-if="currentStep > 1"
      class="resumen-bar__edit"
      @click.stop="onEdit"
    >
      <UiIcon name="i-lucide-pencil" size="xs" />
      {{ t('common.edit') }}
    </button>
  </div>
</template>

<style scoped>
.resumen-bar {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-background-secondary);
  border-bottom: 0.5px solid var(--color-border-tertiary);
  /* sin cursor: pointer ni transition */
}

.resumen-bar:hover {
  background: var(--color-background-tertiary);
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
  margin-top: var(--space-1);
}

.resumen-bar__edit {
  display: flex;
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
  flex-shrink: 0;
  transition: all 0.15s;
}

.resumen-bar__edit:hover {
  background: var(--color-secondary-100);
}
</style>