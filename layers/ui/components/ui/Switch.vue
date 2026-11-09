<script setup lang="ts">
interface Props {
  label: string
  description?: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  disabled: false,
})

const modelValue = defineModel<boolean>({ default: false })
</script>

<template>
  <USwitch
    v-model="modelValue"
    :label="label"
    :description="description"
    :disabled="disabled"
    :ui="{
      root: 'ui-switch',
      base: 'ui-switch__track',
      thumb: 'ui-switch__thumb',
      wrapper: 'ui-switch__text',
      label: 'ui-switch__label',
      description: 'ui-switch__description',
    }"
  />
</template>

<style>
.ui-switch {
  flex-direction: row-reverse;
  justify-content: space-between;
  gap: 16px;
  min-block-size: var(--mp-tap);
  align-items: center;
  font-family: var(--mp-font);
}

.ui-switch__track {
  inline-size: 44px;
  block-size: 26px;
  border-radius: var(--mp-r-pill);
  background: var(--mp-border);
}

.ui-switch__track[data-state='checked'] {
  background: var(--mp-ink);
}

.ui-switch__track:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

.ui-switch__thumb {
  inline-size: 22px;
  block-size: 22px;
  background: var(--mp-surface);
}

.ui-switch__label {
  color: var(--mp-ink);
  font-size: var(--mp-fs-body-lg);
  font-weight: var(--mp-fw-semibold);
}

.ui-switch__description {
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body-sm);
}
</style>
