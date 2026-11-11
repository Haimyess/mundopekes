<script setup lang="ts">
import type { VerifiedFormFailure } from '~/composables/useVerifiedForm'

interface Props {
  label: string
  failure: VerifiedFormFailure | null
  isSubmitting: boolean
  canSubmit: boolean
  note?: string
}

withDefaults(defineProps<Props>(), { note: undefined })

const token = defineModel<string | null>('token', { default: null })

const { t } = useI18n()
const turnstile = useTemplateRef<{ reset: () => void }>('turnstile')

const handleVerify = (value: string) => {
  token.value = value
}
const handleTokenLost = () => {
  token.value = null
}
const reset = () => turnstile.value?.reset()

defineExpose({ reset })
</script>

<template>
  <div class="form-verified-submit">
    <SuggestionsTurnstileWidget
      ref="turnstile"
      @verify="handleVerify"
      @expire="handleTokenLost"
      @fail="handleTokenLost"
    />
    <p v-if="failure" class="form-verified-submit__error" role="alert">
      {{ t(`forms.errors.${failure}`) }}
    </p>
    <UiButton type="submit" block :loading="isSubmitting" :disabled="!canSubmit">
      {{ label }}
    </UiButton>
    <p v-if="note" class="form-verified-submit__note">{{ note }}</p>
  </div>
</template>

<style scoped>
.form-verified-submit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-verified-submit__error {
  margin: 0;
  color: var(--mp-coral-700);
  font-size: var(--mp-fs-body-sm);
}

.form-verified-submit__note {
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-label-sm);
  text-align: center;
}
</style>
