<script setup lang="ts">
import { SUGGESTION_LIMITS, type SuggestionOrigin } from '@mundopekes/schemas'
import type { QuickSuggestionField } from '~/composables/useQuickSuggestion'

interface Props {
  origin: SuggestionOrigin
}

const props = defineProps<Props>()

const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { form, token, status, failure, canSubmit, errorFor, touch, submit, reset } =
  useQuickSuggestion(props.origin)
const turnstile = useTemplateRef<{ reset: () => void }>('turnstile')

const isSuccess = computed(() => status.value === 'success')
const failureMessage = computed(() =>
  failure.value ? t(`quickSuggestion.errors.${failure.value}`) : null
)

watch(isOpen, (open) => {
  if (!open && isSuccess.value) reset()
})

const handleBlur = (field: QuickSuggestionField) => touch(field)
const handleVerify = (value: string) => {
  token.value = value
}
const handleTokenLost = () => {
  token.value = null
}
const handleSubmit = async () => {
  const isSent = await submit()
  if (!isSent) turnstile.value?.reset()
}
const handleClose = () => {
  isOpen.value = false
}
</script>

<template>
  <UiSheet
    v-model:open="isOpen"
    :title="t('quickSuggestion.title')"
    :description="isSuccess ? undefined : t('quickSuggestion.description')"
    :close-label="t('layout.close')"
  >
    <template #trigger>
      <slot name="trigger" />
    </template>
    <div v-if="isSuccess" class="quick-sheet__success" role="status">
      <UiIcon name="i-hugeicons-checkmark-circle-02" :size="40" />
      <p class="quick-sheet__thanks">{{ t('quickSuggestion.thanks') }}</p>
      <UiButton variant="secondary" @click="handleClose">{{ t('layout.close') }}</UiButton>
    </div>
    <form v-else class="quick-sheet__form" novalidate @submit.prevent="handleSubmit">
      <UiFormField
        :label="t('quickSuggestion.name')"
        name="name"
        :hint="t('quickSuggestion.nameHint')"
        :error="errorFor('name')"
        is-required
      >
        <UiInput
          v-model="form.name"
          :maxlength="SUGGESTION_LIMITS.name"
          autocomplete="off"
          @blur="handleBlur('name')"
        />
      </UiFormField>
      <UiFormField
        :label="t('quickSuggestion.where')"
        name="where"
        :hint="t('quickSuggestion.whereHint')"
        :error="errorFor('where')"
        is-required
      >
        <UiInput
          v-model="form.where"
          :maxlength="SUGGESTION_LIMITS.where"
          autocomplete="address-level2"
          @blur="handleBlur('where')"
        />
      </UiFormField>
      <UiFormField
        :label="t('quickSuggestion.link')"
        name="link"
        :hint="t('quickSuggestion.linkHint')"
        :error="errorFor('link')"
      >
        <UiInput v-model="form.link" type="url" inputmode="url" @blur="handleBlur('link')" />
      </UiFormField>
      <UiFormField
        :label="t('quickSuggestion.why')"
        name="why"
        :hint="t('quickSuggestion.whyHint')"
        :error="errorFor('why')"
      >
        <UiTextarea
          v-model="form.why"
          :maxlength="SUGGESTION_LIMITS.why"
          @blur="handleBlur('why')"
        />
      </UiFormField>
      <SuggestionsTurnstileWidget
        ref="turnstile"
        @verify="handleVerify"
        @expire="handleTokenLost"
        @fail="handleTokenLost"
      />
      <p v-if="failureMessage" class="quick-sheet__error" role="alert">{{ failureMessage }}</p>
      <UiButton type="submit" block :loading="status === 'submitting'" :disabled="!canSubmit">
        {{ t('quickSuggestion.submit') }}
      </UiButton>
    </form>
  </UiSheet>
</template>

<style scoped>
.quick-sheet__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quick-sheet__error {
  margin: 0;
  color: var(--mp-coral-700);
  font-size: var(--mp-fs-body-sm);
}

.quick-sheet__success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-block: 16px;
  color: var(--mp-green);
  text-align: center;
}

.quick-sheet__thanks {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body);
}
</style>
