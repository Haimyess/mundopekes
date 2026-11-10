<script setup lang="ts">
interface Props {
  label: string
  value?: string
  icon: string
  count?: number
}

withDefaults(defineProps<Props>(), {
  value: undefined,
  count: undefined,
})
</script>

<template>
  <button
    type="button"
    class="sheet-trigger"
    :class="{ 'sheet-trigger--active': !!value || !!count }"
  >
    <UiIcon :name="icon" :size="16" />
    <span class="sheet-trigger__label">{{ label }}</span>
    <span v-if="value" class="sheet-trigger__value">{{ value }}</span>
    <span v-if="count" class="sheet-trigger__count" dir="ltr">{{ count }}</span>
  </button>
</template>

<style scoped>
.sheet-trigger {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  min-block-size: var(--mp-tap);
  padding-inline: 14px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  color: var(--mp-ink);
  font: inherit;
  font-size: var(--mp-fs-body-sm);
  font-weight: var(--mp-fw-medium);
  cursor: pointer;
  white-space: nowrap;
}

.sheet-trigger--active {
  border-color: var(--mp-ink);
}

.sheet-trigger:focus-visible {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}

.sheet-trigger__value {
  color: var(--mp-text-2);
  font-weight: var(--mp-fw-regular);
}

.sheet-trigger__count {
  display: inline-grid;
  place-items: center;
  min-inline-size: 20px;
  block-size: 20px;
  padding-inline: 6px;
  border-radius: var(--mp-r-pill);
  background: var(--mp-ink);
  color: var(--mp-surface);
  font-size: var(--mp-fs-label-sm);
}
</style>
