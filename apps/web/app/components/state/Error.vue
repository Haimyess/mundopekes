<script setup lang="ts">
interface Props {
  title: string
  description?: string
  retryLabel?: string
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  retryLabel: undefined,
})

const emit = defineEmits<{ retry: [] }>()

const handleRetry = () => emit('retry')
</script>

<template>
  <section class="state-error" role="alert">
    <UiIcon name="i-hugeicons-alert-02" :size="40" class="state-error__icon" />
    <h2 class="state-error__title">{{ title }}</h2>
    <p v-if="description" class="state-error__description">{{ description }}</p>
    <UiButton v-if="retryLabel" variant="secondary" icon="i-hugeicons-reload" @click="handleRetry">
      {{ retryLabel }}
    </UiButton>
  </section>
</template>

<style scoped>
.state-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px var(--mp-gutter);
  color: var(--mp-ink);
  font-family: var(--mp-font);
  text-align: center;
}

.state-error__icon {
  color: var(--mp-coral-700);
}

.state-error__title {
  margin: 8px 0 0;
  font-size: var(--mp-fs-card-title);
  font-weight: var(--mp-fw-heavy);
}

.state-error__description {
  max-inline-size: 36ch;
  margin: 0 0 8px;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body);
}
</style>
