<script setup lang="ts">
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'

defineProps<{
  currentStep: number
  submitting: boolean
  canContinue: boolean
}>()

const emit = defineEmits<{
  next: []
  prev: []
}>()

const wizard = useSuggestionWizard()
const { t } = useI18n()
</script>

<template>
  <div class="wizard-body">
    <div class="wizard-body__sticky">
      <SuggestionsWizardResumenBar :current-step="currentStep" />
    </div>

    <div class="wizard-body__content">
      <Transition name="step-fade" mode="out-in">
        <SuggestionsWizardStepLugar v-if="currentStep === 1" key="1" />
        <SuggestionsWizardStepActividad v-else-if="currentStep === 2" key="2" />
        <SuggestionsWizardStepResumen
          v-else-if="currentStep === 3"
          key="3"
          @edit-activities="emit('prev')"
        />
      </Transition>
    </div>

    <div class="wizard-body__footer">
      <UiButton v-if="currentStep > 1" variant="ghost" size="sm" @click="emit('prev')">
        {{ t('common.back') }}
      </UiButton>
      <div style="flex: 1" />
      <UiButton
        variant="primary"
        size="sm"
        :loading="submitting"
        :disabled="!canContinue || submitting"
        @click="emit('next')"
      >
        {{ currentStep === wizard.STEPS.length ? t('suggest.submit') : t('common.continue') }}
      </UiButton>
    </div>
  </div>
</template>

<style scoped>
.wizard-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.wizard-body__sticky {
  flex-shrink: 0;
}

.wizard-body__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-secondary) transparent;
}

.wizard-body__footer {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-5);
  border-top: 0.5px solid var(--color-border-tertiary);
  flex-shrink: 0;
  gap: var(--space-2);
  background: var(--color-background-primary);
}

.step-fade-enter-active,
.step-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.step-fade-enter-from {
  opacity: 0;
  transform: translateX(8px);
}
.step-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
