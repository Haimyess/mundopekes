<script setup lang="ts">
import type { DetailContact } from '#shared/types/detail'

interface Props {
  contact: DetailContact
  targetType: 'activity' | 'place'
  targetId: string
}

const props = defineProps<Props>()

const { t } = useI18n()
const { trackDirectionsClick } = useTracking()

const callHref = computed(() =>
  props.contact.phone ? `tel:${props.contact.phone.replace(/[^\d+]/g, '')}` : null
)
const hasActions = computed(() => !!props.contact.directionsUrl || !!callHref.value)

const handleDirectionsClick = () => trackDirectionsClick(props.targetType, props.targetId, 'maps')
</script>

<template>
  <div v-if="hasActions" class="detail-action-bar">
    <a
      v-if="contact.directionsUrl"
      :href="contact.directionsUrl"
      class="detail-action-bar__primary"
      target="_blank"
      rel="noopener noreferrer"
      @click="handleDirectionsClick"
    >
      <UiIcon name="i-hugeicons-route-01" :size="20" />
      {{ t('detail.actions.directions') }}
    </a>
    <a v-if="callHref" :href="callHref" class="detail-action-bar__secondary">
      <UiIcon name="i-hugeicons-call" :size="20" />
      {{ t('detail.actions.call') }}
    </a>
  </div>
</template>

<style scoped>
.detail-action-bar {
  position: sticky;
  z-index: 30;
  inset-block-end: 0;
  display: flex;
  gap: 8px;
  margin-inline: calc(var(--mp-gutter) * -1);
  padding: 12px var(--mp-gutter) calc(12px + env(safe-area-inset-bottom));
  border-block-start: 1px solid var(--mp-border-soft);
  background: var(--mp-surface);
}

.detail-action-bar__primary,
.detail-action-bar__secondary {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-block-size: var(--mp-tap);
  border-radius: var(--mp-r-btn);
  font-weight: var(--mp-fw-bold);
  text-decoration: none;
}

.detail-action-bar__primary {
  background: var(--mp-ink);
  color: var(--mp-surface);
}

.detail-action-bar__secondary {
  border: 1px solid var(--mp-border);
  color: var(--mp-ink);
}

.detail-action-bar__primary:focus-visible,
.detail-action-bar__secondary:focus-visible {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}

@media (min-width: 1200px) {
  .detail-action-bar {
    display: none;
  }
}
</style>
