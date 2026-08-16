<script setup lang="ts">
import type { ContactIntent } from '~/types/contact'

const props = defineProps<{
  form: { name: string; email: string; message: string }
  intent: ContactIntent
  isLoading: boolean
  isProviderIntent: boolean
  prefillActivityTitle: string | undefined
  businessName: string
  briefDesc: string
}>()

const emit = defineEmits<{
  submit: []
  cancel: []
  'update:intent': [value: ContactIntent]
  'update:businessName': [value: string]
  'update:briefDesc': [value: string]
  'update:name': [value: string]
  'update:email': [value: string]
  'update:message': [value: string]
}>()

const { t, locale } = useI18n()

const intentOptions = computed(() => [
  { label: t('contact.intent_outdated'), value: 'outdated_activity' },
  { label: t('contact.intent_feedback'), value: 'feedback' },
  { label: t('contact.intent_provider'), value: 'provider_inquiry' },
  { label: t('contact.intent_other'), value: 'other' },
])

const selectedIntent = computed({
  get: () => props.intent as string,
  set: (v) => emit('update:intent', v as ContactIntent),
})

const providerSubmitDisabled = computed(
  () => !props.form.name || !props.form.email || !props.businessName
)
</script>

<template>
  <div class="contact-form" :dir="locale === 'he' ? 'rtl' : 'ltr'">
    <!-- Intent selector -->
    <div class="contact-form__field">
      <label class="contact-form__label">{{ t('contact.intent_label') }}</label>
      <UiSelect v-model="selectedIntent" :options="intentOptions" />
    </div>

    <!-- Prefill activity info -->
    <div v-if="prefillActivityTitle" class="contact-form__prefill">
      <span class="contact-form__prefill-label">{{ t('contact.about') }}</span>
      <span class="contact-form__prefill-title">{{ prefillActivityTitle }}</span>
    </div>

    <!-- Name -->
    <div class="contact-form__field">
      <label class="contact-form__label">{{ t('contact.name') }}</label>
      <UiInput
        :model-value="form.name"
        :placeholder="t('contact.name_placeholder')"
        required
        @update:model-value="emit('update:name', $event as string)"
      />
    </div>

    <!-- Email -->
    <div class="contact-form__field">
      <label class="contact-form__label">{{ t('contact.email') }}</label>
      <UiInput
        :model-value="form.email"
        type="email"
        :placeholder="t('contact.email_placeholder')"
        required
        @update:model-value="emit('update:email', $event as string)"
      />
    </div>

    <!-- Provider intent: business fields -->
    <template v-if="isProviderIntent">
      <div class="contact-form__field">
        <label class="contact-form__label">{{ t('provider.drawer_business_name') }}</label>
        <UiInput
          :model-value="businessName"
          :placeholder="t('provider.drawer_business_placeholder')"
          required
          @update:model-value="emit('update:businessName', $event as string)"
        />
      </div>
      <div class="contact-form__field">
        <label class="contact-form__label">{{ t('provider.drawer_brief_desc') }}</label>
        <textarea
          :value="briefDesc"
          class="contact-form__textarea"
          :placeholder="t('provider.drawer_brief_placeholder')"
          rows="3"
          maxlength="200"
          @input="emit('update:briefDesc', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
      <!-- Deshabilitado temporalmente — ver pages/become-provider.vue -->
      <!-- <div class="contact-form__provider-link">
        <NuxtLink to="/become-provider" class="contact-form__register-link" @click="emit('cancel')">
          {{ t('provider.drawer_register_link') }} →
        </NuxtLink>
      </div> -->
    </template>

    <!-- Generic intent: message textarea -->
    <div v-else class="contact-form__field">
      <label class="contact-form__label">{{ t('contact.message') }}</label>
      <textarea
        :value="form.message"
        class="contact-form__textarea"
        :placeholder="t('contact.message_placeholder')"
        rows="4"
        required
        @input="emit('update:message', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <!-- Actions -->
    <div class="contact-form__actions">
      <UiButton
        :loading="isLoading"
        :disabled="
          isProviderIntent ? providerSubmitDisabled : !form.name || !form.email || !form.message
        "
        @click="emit('submit')"
      >
        {{ t('contact.submit') }}
      </UiButton>
      <UiButton variant="ghost" :disabled="isLoading" @click="emit('cancel')">
        {{ t('contact.cancel') }}
      </UiButton>
    </div>
  </div>
</template>

<style scoped>
.contact-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4, 1rem);
  padding: var(--spacing-4, 1rem);
  padding-bottom: var(--spacing-8, 2rem);
}

.contact-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1, 0.25rem);
}

.contact-form__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-secondary-700, #374151);
}

.contact-form__prefill {
  display: flex;
  align-items: center;
  gap: var(--spacing-2, 0.5rem);
  padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
  background: var(--color-primary-50, #eff6ff);
  border: 1px solid var(--color-primary-200, #bfdbfe);
  border-radius: var(--radius-md, 0.375rem);
  font-size: 0.875rem;
}

.contact-form__prefill-label {
  color: var(--color-primary-600, #2563eb);
  font-weight: 600;
  white-space: nowrap;
}

.contact-form__prefill-title {
  color: var(--color-secondary-700, #374151);
}

.contact-form__textarea {
  width: 100%;
  padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
  border: 1px solid var(--color-secondary-300, #d1d5db);
  border-radius: var(--radius-md, 0.375rem);
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--color-secondary-900, #111827);
  background: var(--color-white, #fff);
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.15s;
}

.contact-form__textarea:focus {
  outline: none;
  border-color: var(--color-primary-500, #3b82f6);
  box-shadow: 0 0 0 2px var(--color-primary-100, #dbeafe);
}

.contact-form__provider-link {
  padding: var(--spacing-2, 0.5rem) 0;
}

.contact-form__register-link {
  font-size: 0.875rem;
  color: var(--color-primary-600, #2563eb);
  text-decoration: none;
  font-weight: 500;
}

.contact-form__register-link:hover {
  text-decoration: underline;
}

.contact-form__actions {
  display: flex;
  gap: var(--spacing-3, 0.75rem);
  padding-top: var(--spacing-2, 0.5rem);
}
</style>
