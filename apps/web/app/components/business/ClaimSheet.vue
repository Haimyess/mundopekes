<script setup lang="ts">
import { BUSINESS_LIMITS, BUSINESS_ROLES, type BusinessRole } from '@mundopekes/schemas'

type ClaimTextField = 'name' | 'email' | 'phone'

interface Props {
  placeId: string
  placeName: string
}

interface FieldConfig {
  name: ClaimTextField
  maxlength: number
  type: 'text' | 'email' | 'tel'
  autocomplete: string
}

const FIELDS: FieldConfig[] = [
  { name: 'name', maxlength: BUSINESS_LIMITS.contactName, type: 'text', autocomplete: 'name' },
  { name: 'email', maxlength: BUSINESS_LIMITS.email, type: 'email', autocomplete: 'email' },
  { name: 'phone', maxlength: BUSINESS_LIMITS.phone, type: 'tel', autocomplete: 'tel' },
]

const props = defineProps<Props>()

const isOpen = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { form, token, status, failure, canSubmit, errorFor, touch, submit, reset } =
  useBusinessClaim(props.placeId)
const verifiedSubmit = useTemplateRef<{ reset: () => void }>('verifiedSubmit')

const isSuccess = computed(() => status.value === 'success')
const roleOptions = computed(() =>
  BUSINESS_ROLES.map((role) => ({ value: role, label: t(`claim.roles.${role}`) }))
)
const isTermsAccepted = computed({
  get: () => form.acceptTerms,
  set: (value: boolean) => {
    form.acceptTerms = value
    touch('acceptTerms')
  },
})
const selectedRole = computed({
  get: (): string | null => form.role,
  set: (value: string | null) => {
    form.role = BUSINESS_ROLES.find((role): role is BusinessRole => role === value) ?? null
    touch('role')
  },
})

watch(isOpen, (open) => {
  if (!open && isSuccess.value) reset()
})

const handleBlur = (field: ClaimTextField) => touch(field)
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
    :title="t('claim.title')"
    :description="isSuccess ? undefined : t('claim.description', { place: placeName })"
    :close-label="t('layout.close')"
  >
    <template #trigger>
      <slot name="trigger" />
    </template>
    <FormSuccess v-if="isSuccess" :message="t('claim.thanks')">
      <UiButton variant="secondary" @click="handleClose">{{ t('layout.close') }}</UiButton>
    </FormSuccess>
    <form v-else class="claim-sheet__form" novalidate @submit.prevent="handleSubmit">
      <UiRadioGroup
        v-model="selectedRole"
        :legend="t('claim.role')"
        name="role"
        :items="roleOptions"
        :error="errorFor('role')"
        is-required
      />
      <UiFormField
        v-for="field in FIELDS"
        :key="field.name"
        :label="t(`claim.${field.name}`)"
        :name="field.name"
        :hint="t(`claim.${field.name}Hint`)"
        :error="errorFor(field.name)"
        is-required
      >
        <UiInput
          v-model="form[field.name]"
          :type="field.type"
          :maxlength="field.maxlength"
          :autocomplete="field.autocomplete"
          @blur="handleBlur(field.name)"
        />
      </UiFormField>
      <div class="claim-sheet__terms">
        <UiCheckbox v-model="isTermsAccepted" :label="t('claim.acceptTerms')" />
        <NuxtLink to="/terms" target="_blank" class="claim-sheet__terms-link">
          {{ t('claim.readTerms') }}
          <span class="claim-sheet__sr-only">{{ t('detail.opensNewTab') }}</span>
        </NuxtLink>
        <p v-if="errorFor('acceptTerms')" class="claim-sheet__error" role="alert">
          {{ errorFor('acceptTerms') }}
        </p>
      </div>
      <FormVerifiedSubmit
        ref="verifiedSubmit"
        v-model:token="token"
        :label="t('claim.submit')"
        :failure="failure"
        :is-submitting="status === 'submitting'"
        :can-submit="canSubmit"
      />
    </form>
  </UiSheet>
</template>

<style scoped>
.claim-sheet__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.claim-sheet__terms {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.claim-sheet__terms-link {
  align-self: flex-start;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body-sm);
  text-decoration: underline;
}

.claim-sheet__terms-link:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

.claim-sheet__error {
  margin: 0;
  color: var(--mp-coral-700);
  font-size: var(--mp-fs-label-sm);
}

.claim-sheet__sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
