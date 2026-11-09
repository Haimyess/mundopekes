<script setup lang="ts">
interface Props {
  label: string
  decrementLabel: string
  incrementLabel: string
  min?: number
  max?: number
  step?: number
  valueLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 99,
  step: 1,
  valueLabel: undefined,
})

const modelValue = defineModel<number>({ default: 0 })

const labelId = useId()

const canDecrement = computed(() => modelValue.value - props.step >= props.min)
const canIncrement = computed(() => modelValue.value + props.step <= props.max)
const displayedValue = computed(() => props.valueLabel ?? String(modelValue.value))

const handleDecrement = () => {
  if (canDecrement.value) modelValue.value -= props.step
}

const handleIncrement = () => {
  if (canIncrement.value) modelValue.value += props.step
}
</script>

<template>
  <div class="ui-stepper" role="group" :aria-labelledby="labelId">
    <span :id="labelId" class="ui-stepper__label">{{ label }}</span>
    <div class="ui-stepper__controls">
      <button
        type="button"
        class="ui-stepper__button"
        :aria-label="decrementLabel"
        :disabled="!canDecrement"
        @click="handleDecrement"
      >
        <UiIcon name="i-hugeicons-minus-sign" :size="20" />
      </button>
      <output class="ui-stepper__value" aria-live="polite" dir="ltr">{{ displayedValue }}</output>
      <button
        type="button"
        class="ui-stepper__button"
        :aria-label="incrementLabel"
        :disabled="!canIncrement"
        @click="handleIncrement"
      >
        <UiIcon name="i-hugeicons-plus-sign" :size="20" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.ui-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-block-size: var(--mp-tap);
  color: var(--mp-ink);
  font-family: var(--mp-font);
}

.ui-stepper__label {
  font-size: var(--mp-fs-body-lg);
  font-weight: var(--mp-fw-semibold);
}

.ui-stepper__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ui-stepper__button {
  display: grid;
  place-items: center;
  inline-size: var(--mp-tap);
  block-size: var(--mp-tap);
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  color: var(--mp-ink);
  cursor: pointer;
}

.ui-stepper__button:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

.ui-stepper__button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.ui-stepper__value {
  min-inline-size: 3ch;
  font-size: var(--mp-fs-body-lg);
  font-weight: var(--mp-fw-bold);
  text-align: center;
}
</style>
