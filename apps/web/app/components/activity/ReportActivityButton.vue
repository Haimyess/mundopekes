<script setup lang="ts">
interface Props {
  activityId: string
  activityTitle: string
}

const props = defineProps<Props>()
const { t } = useI18n()
const { open } = useContactForm()

function handleClick() {
  open('outdated_activity', {
    activityId: props.activityId,
    activityTitle: props.activityTitle,
  })
}
</script>

<template>
  <div class="report-btn">
    <UiButton variant="ghost" size="sm" @click="handleClick">
      <UiIcon name="i-lucide-flag" size="sm" class="report-btn__icon" />
      {{ t('activity.report_outdated') }}
    </UiButton>
  </div>
</template>

<style scoped>
.report-btn {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-6, 1.5rem);
}

.report-btn :deep(button) {
  color: var(--color-neutral-400, #9ca3af);
  font-size: 0.75rem;
  gap: 0.375rem;
}

.report-btn :deep(button:hover) {
  color: var(--color-neutral-600, #4b5563);
}

.report-btn__icon {
  opacity: 0.7;
}
</style>
