<script setup lang="ts">
interface Props {
  label: string
  name: string
  hint?: string
  error?: string
  isRequired?: boolean
}

withDefaults(defineProps<Props>(), {
  hint: undefined,
  error: undefined,
  isRequired: false,
})
</script>

<template>
  <UFormField
    :label="label"
    :name="name"
    :description="hint"
    :error="error || false"
    :required="isRequired"
    :ui="{
      root: 'ui-form-field',
      label: 'ui-form-field__label',
      description: 'ui-form-field__hint',
      error: 'ui-form-field__error',
    }"
  >
    <slot />
  </UFormField>
</template>

<style scoped>
:deep(.ui-form-field__label) {
  color: var(--mp-ink);
  font-size: var(--mp-fs-body-sm);
  font-weight: var(--mp-fw-semibold);
}

:deep(.ui-form-field__hint) {
  color: var(--mp-text-2);
  font-size: var(--mp-fs-label-sm);
}

:deep(.ui-form-field__error) {
  color: var(--mp-coral-700);
  font-size: var(--mp-fs-label-sm);
}
</style>
