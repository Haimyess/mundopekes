<script setup lang="ts">
interface Props {
  title: string
  description?: string
  icon?: string
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  icon: 'i-hugeicons-search-remove',
})
</script>

<template>
  <section class="state-empty" role="status">
    <UiIcon :name="icon" :size="40" class="state-empty__icon" />
    <h2 class="state-empty__title">{{ title }}</h2>
    <p v-if="description" class="state-empty__description">{{ description }}</p>
    <div v-if="$slots.default" class="state-empty__actions">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.state-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px var(--mp-gutter);
  color: var(--mp-ink);
  font-family: var(--mp-font);
  text-align: center;
}

.state-empty__icon {
  color: var(--mp-text-3);
}

.state-empty__title {
  margin: 8px 0 0;
  font-size: var(--mp-fs-card-title);
  font-weight: var(--mp-fw-heavy);
}

.state-empty__description {
  max-inline-size: 36ch;
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body);
}

.state-empty__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-block-start: 12px;
}
</style>
