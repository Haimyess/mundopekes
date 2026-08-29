<script setup lang="ts">
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const wizard = useSuggestionWizard()
const { t } = useI18n()
const toast = useToast()
const isMobile = useMediaQuery('(max-width: 768px)')
const currentStep = ref(1)
const submitting = ref(false)
const TOTAL_STEPS = wizard.STEPS.length

// Step order: 1=Lugar, 2=Actividad(es), 3=Resumen (see WIZARD_STEPS)
const canContinue = computed(() => {
  if (currentStep.value === 1) return wizard.hasPlace.value
  if (currentStep.value === 2) return wizard.hasActivity.value
  return true
})

const next = async () => {
  if (currentStep.value < TOTAL_STEPS) {
    currentStep.value++
    return
  }
  await submit()
}

const prev = () => {
  if (currentStep.value > 1) currentStep.value--
}

const submit = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    await $fetch('/api/suggestions', {
      method: 'POST',
      body: wizard.buildPayload(),
    })
    toast.add({
      title: t('suggest.success_title'),
      description: t('suggest.success_desc'),
      color: 'success',
      duration: 5000,
    })
    handleClose()
  } catch (e) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({
      title: t('suggest.error_title'),
      description: err?.data?.message ?? err?.message ?? t('common.error'),
      color: 'error',
      duration: 6000,
    })
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  emit('update:open', false)
  setTimeout(() => {
    currentStep.value = 1
    wizard.reset()
  }, 300)
}
</script>

<template>
  <!-- Mobile: Drawer -->
  <UiDrawer
    v-if="isMobile"
    :open="open"
    direction="bottom"
    max-height="92vh"
    @update:open="
      (v) => {
        if (!v) handleClose()
      }
    "
  >
    <template #body>
      <div class="wizard-layout">
        <SuggestionsWizardHeader
          :current-step="currentStep"
          :total="TOTAL_STEPS"
          @close="handleClose"
        />
        <SuggestionsWizardBody
          :current-step="currentStep"
          :submitting="submitting"
          :can-continue="canContinue"
          @next="next"
          @prev="prev"
        />
      </div>
    </template>
  </UiDrawer>

  <!-- Desktop: Modal -->
  <UModal
    v-else
    :open="open"
    :ui="{ content: 'sm:max-w-lg p-0 overflow-hidden' }"
    @update:open="
      (v) => {
        if (!v) handleClose()
      }
    "
  >
    <template #content>
      <div class="wizard-layout">
        <SuggestionsWizardHeader
          :current-step="currentStep"
          :total="TOTAL_STEPS"
          @close="handleClose"
        />
        <SuggestionsWizardBody
          :current-step="currentStep"
          :submitting="submitting"
          :can-continue="canContinue"
          @next="next"
          @prev="prev"
        />
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.wizard-layout {
  display: flex;
  flex-direction: column;
  height: 92vh;
  max-height: 92vh;
  overflow: hidden;
}

@media (min-width: 768px) {
  .wizard-layout {
    height: 580px;
    max-height: 580px;
  }
}
</style>
