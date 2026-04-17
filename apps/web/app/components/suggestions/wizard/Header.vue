<script setup lang="ts">
import { WIZARD_STEPS } from '~/composables/useSuggestionWizard'

const props = defineProps<{
  currentStep: number
  total: number
}>()

const emit = defineEmits<{ close: [] }>()

console.log('WIZARD_STEPS:', WIZARD_STEPS)
</script>


<template>
  <div class="wizard-header">
    <div class="wizard-header__top">
      <div class="wizard-header__info">
        <span class="wizard-header__step-hint">Paso {{ currentStep }} de {{ total }}</span>
        <span class="wizard-header__step-name">{{ WIZARD_STEPS[currentStep - 1]?.label }}</span>
      </div>
      <div class="wizard-header__right">
        <div class="wizard-header__lines">
      <div
  v-for="(_, i) in WIZARD_STEPS"
  :key="i"
  :style="{
    height: '3px',
    width: i + 1 === currentStep ? '28px' : '20px',
    borderRadius: '9999px',
    backgroundColor: i + 1 < currentStep
      ? '#86efac'
      : i + 1 === currentStep
        ? '#22c55e'
        : '#d4d4d4',
    transition: 'all 0.3s',
    flexShrink: '0',
  }"
/>
        </div>
        <button class="wizard-header__close" @click="emit('close')">
          <UiIcon name="i-lucide-x" size="sm" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wizard-header {
  padding: var(--space-4) var(--space-5) var(--space-3);
  flex-shrink: 0;
  border-bottom: 0.5px solid var(--color-border-tertiary);
  background: var(--color-background-primary);
}

.wizard-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wizard-header__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wizard-header__step-hint {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.wizard-header__step-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.wizard-header__right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.wizard-header__lines {
  display: flex;
  gap: 4px;
  align-items: center;
}

.wizard-header__close {
  width: 28px;
  height: 28px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: background 0.15s;
}

.wizard-header__close:hover {
  background: var(--color-background-secondary);
}
</style>
