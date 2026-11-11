<script setup lang="ts">
interface RadioOption {
  label: string
  value: string
}

interface Props {
  legend: string
  name: string
  items: RadioOption[]
  error?: string
  isRequired?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  error: undefined,
  isRequired: false,
})

const modelValue = defineModel<string | null>({ default: null })

const selected = computed({
  get: () => modelValue.value ?? undefined,
  set: (value: string | undefined) => {
    modelValue.value = value ?? null
  },
})

const errorId = computed(() => `${props.name}-error`)
</script>

<template>
  <div class="ui-radio-group">
    <URadioGroup
      v-model="selected"
      :legend="legend"
      :name="name"
      :items="items"
      :required="isRequired"
      orientation="horizontal"
      variant="card"
      indicator="hidden"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? errorId : undefined"
      :ui="{
        fieldset: 'ui-radio-group__options',
        legend: 'ui-radio-group__legend',
        item: 'ui-radio-group__item',
        label: 'ui-radio-group__label',
      }"
    />
    <p v-if="error" :id="errorId" class="ui-radio-group__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.ui-radio-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

:deep(.ui-radio-group__legend) {
  margin-block-end: 8px;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body-sm);
  font-weight: var(--mp-fw-semibold);
}

:deep(.ui-radio-group__options) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.ui-radio-group__item) {
  display: inline-flex;
  align-items: center;
  min-block-size: var(--mp-tap);
  padding-inline: 14px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  color: var(--mp-ink);
  cursor: pointer;
}

:deep(.ui-radio-group__item:hover) {
  border-color: var(--mp-ink);
}

:deep(.ui-radio-group__item:focus-within) {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

:deep(.ui-radio-group__item:has([data-state='checked'])) {
  border-color: var(--mp-ink);
  background: var(--mp-ink);
  color: var(--mp-surface);
}

:deep(.ui-radio-group__label) {
  color: inherit;
  font-size: var(--mp-fs-body);
  font-weight: var(--mp-fw-semibold);
  cursor: pointer;
}

.ui-radio-group__error {
  margin: 0;
  color: var(--mp-coral-700);
  font-size: var(--mp-fs-label-sm);
}
</style>
