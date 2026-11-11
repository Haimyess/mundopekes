<script setup lang="ts">
import { BUSINESS_LIMITS } from '@mundopekes/schemas'

type JoinField = 'businessName' | 'activityType' | 'city' | 'phone'

interface FieldConfig {
  name: JoinField
  maxlength: number
  type: 'text' | 'tel'
  autocomplete: string
}

const FIELDS: FieldConfig[] = [
  {
    name: 'businessName',
    maxlength: BUSINESS_LIMITS.businessName,
    type: 'text',
    autocomplete: 'organization',
  },
  {
    name: 'activityType',
    maxlength: BUSINESS_LIMITS.activityType,
    type: 'text',
    autocomplete: 'off',
  },
  { name: 'city', maxlength: BUSINESS_LIMITS.city, type: 'text', autocomplete: 'address-level2' },
  { name: 'phone', maxlength: BUSINESS_LIMITS.phone, type: 'tel', autocomplete: 'tel' },
]

const { t } = useI18n()
const { form, token, status, failure, canSubmit, errorFor, touch, submit } = useBusinessJoin()
const verifiedSubmit = useTemplateRef<{ reset: () => void }>('verifiedSubmit')

const isSuccess = computed(() => status.value === 'success')

const handleBlur = (field: JoinField) => touch(field)
const handleSubmit = async () => {
  const isSent = await submit()
  if (!isSent) verifiedSubmit.value?.reset()
}
</script>

<template>
  <section class="business-join" aria-labelledby="business-join-title">
    <h2 id="business-join-title" class="business-join__title">
      {{ t('business.join.title') }}
    </h2>
    <FormSuccess v-if="isSuccess" :message="t('business.join.thanks')" />
    <form v-else class="business-join__form" novalidate @submit.prevent="handleSubmit">
      <UiFormField
        v-for="field in FIELDS"
        :key="field.name"
        :label="t(`business.join.${field.name}`)"
        :name="field.name"
        :hint="t(`business.join.${field.name}Hint`)"
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
      <FormVerifiedSubmit
        ref="verifiedSubmit"
        v-model:token="token"
        :label="t('business.join.submit')"
        :note="t('business.join.note')"
        :failure="failure"
        :is-submitting="status === 'submitting'"
        :can-submit="canSubmit"
      />
    </form>
  </section>
</template>

<style scoped>
.business-join {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-panel);
  background: var(--mp-surface);
}

.business-join__title {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-section-title);
  font-weight: var(--mp-fw-heavy);
}

.business-join__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
