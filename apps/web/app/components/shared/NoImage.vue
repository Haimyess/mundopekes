<script setup lang="ts">
// Placeholder cuando una actividad no tiene imágenes
const { t } = useI18n()
</script>

<template>
  <div class="no-image">
    <div class="no-image__inner">
      <UiIcon name="i-heroicons-photo" size="xl" class="no-image__icon" />
      <p class="no-image__label">{{ t('activity.no_image') }}</p>
    </div>
  </div>
</template>

<style scoped>
.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent-100);
}

.no-image__inner {
  text-align: center;
}

.no-image__icon {
  color: var(--color-accent-500);
  margin-inline: auto;
  margin-bottom: var(--space-2);
}

.no-image__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-accent-700);
}
</style>
