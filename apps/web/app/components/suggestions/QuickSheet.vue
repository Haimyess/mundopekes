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
const verifiedSubmit = useTemplateRef<{ reset: () => void }>('verifiedSubmit')

const isSuccess = computed(() => status.value === 'success')

watch(isOpen, (open) => {
  if (!open && isSuccess.value) reset()
})

const handleBlur = (field: QuickSuggestionField) => touch(field)
const handleSubmit = async () => {
  const isSent = await submit()
  if (!isSent) verifiedSubmit.value?.reset()
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
    <FormSuccess v-if="isSuccess" :message="t('quickSuggestion.thanks')">
      <UiButton variant="secondary" @click="handleClose">{{ t('layout.close') }}</UiButton>
    </FormSuccess>
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
      <FormVerifiedSubmit
        ref="verifiedSubmit"
        v-model:token="token"
        :label="t('quickSuggestion.submit')"
        :failure="failure"
        :is-submitting="status === 'submitting'"
        :can-submit="canSubmit"
      />
    </form>
  </UiSheet>
</template>

<style scoped>
.quick-sheet__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
