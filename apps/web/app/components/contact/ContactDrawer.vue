<script setup lang="ts">
import type { ContactIntent } from '~/types/contact'

const { t, locale } = useI18n()
const { isOpen, isLoading, intent, form, prefillActivityTitle, close, submit } = useContactForm()

const intentOptions = computed(() => [
  { label: t('contact.intent_outdated'), value: 'outdated_activity' },
  { label: t('contact.intent_feedback'), value: 'feedback' },
  { label: t('contact.intent_provider'), value: 'provider_inquiry' },
  { label: t('contact.intent_other'), value: 'other' },
])

const selectedIntent = computed({
  get: () => intent.value as string,
  set: (v) => {
    intent.value = v as ContactIntent
  },
})
</script>

<template>
  <UiDrawer v-model:open="isOpen" :title="t('contact.title')" direction="bottom">
    <template #body>
      <div class="contact-drawer" :dir="locale === 'he' ? 'rtl' : 'ltr'">
        <!-- Intent selector -->
        <div class="contact-drawer__field">
          <label class="contact-drawer__label">{{ t('contact.intent_label') }}</label>
          <UiSelect v-model="selectedIntent" :options="intentOptions" />
        </div>

        <!-- Prefill activity info -->
        <div v-if="prefillActivityTitle" class="contact-drawer__prefill">
          <span class="contact-drawer__prefill-label">{{ t('contact.about') }}</span>
          <span class="contact-drawer__prefill-title">{{ prefillActivityTitle }}</span>
        </div>

        <!-- Name -->
        <div class="contact-drawer__field">
          <label class="contact-drawer__label">{{ t('contact.name') }}</label>
          <UiInput v-model="form.name" :placeholder="t('contact.name_placeholder')" required />
        </div>

        <!-- Email -->
        <div class="contact-drawer__field">
          <label class="contact-drawer__label">{{ t('contact.email') }}</label>
          <UiInput
            v-model="form.email"
            type="email"
            :placeholder="t('contact.email_placeholder')"
            required
          />
        </div>

        <!-- Message -->
        <div class="contact-drawer__field">
          <label class="contact-drawer__label">{{ t('contact.message') }}</label>
          <textarea
            v-model="form.message"
            class="contact-drawer__textarea"
            :placeholder="t('contact.message_placeholder')"
            rows="4"
            required
          />
        </div>

        <!-- Actions -->
        <div class="contact-drawer__actions">
          <UiButton
            :loading="isLoading"
            :disabled="!form.name || !form.email || !form.message"
            @click="submit"
          >
            {{ t('contact.submit') }}
          </UiButton>
          <UiButton variant="ghost" :disabled="isLoading" @click="close">
            {{ t('contact.cancel') }}
          </UiButton>
        </div>
      </div>
    </template>
  </UiDrawer>
</template>

<style scoped>
.contact-drawer {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4, 1rem);
  padding: var(--spacing-4, 1rem);
  padding-bottom: var(--spacing-8, 2rem);
}

.contact-drawer__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1, 0.25rem);
}

.contact-drawer__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-secondary-700, #374151);
}

.contact-drawer__prefill {
  display: flex;
  align-items: center;
  gap: var(--spacing-2, 0.5rem);
  padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
  background: var(--color-primary-50, #eff6ff);
  border: 1px solid var(--color-primary-200, #bfdbfe);
  border-radius: var(--radius-md, 0.375rem);
  font-size: 0.875rem;
}

.contact-drawer__prefill-label {
  color: var(--color-primary-600, #2563eb);
  font-weight: 600;
  white-space: nowrap;
}

.contact-drawer__prefill-title {
  color: var(--color-secondary-700, #374151);
}

.contact-drawer__textarea {
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

.contact-drawer__textarea:focus {
  outline: none;
  border-color: var(--color-primary-500, #3b82f6);
  box-shadow: 0 0 0 2px var(--color-primary-100, #dbeafe);
}

.contact-drawer__actions {
  display: flex;
  gap: var(--spacing-3, 0.75rem);
  padding-top: var(--spacing-2, 0.5rem);
}
</style>
