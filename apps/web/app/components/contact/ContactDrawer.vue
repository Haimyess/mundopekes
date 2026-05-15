<script setup lang="ts">
import type { ContactIntent } from '~/types/contact'

const { t } = useI18n()
const { isOpen, isLoading, intent, form, prefillActivityTitle, close, submit } = useContactForm()

const isMobile = useMediaQuery('(max-width: 767px)')

const isProviderIntent = computed(() => intent.value === 'provider_inquiry')

const businessName = ref('')
const briefDesc = ref('')

const handleSubmit = () => {
  if (isProviderIntent.value) {
    form.value.message = `Negocio: ${businessName.value}\n${briefDesc.value}`
  }
  submit()
}
</script>

<template>
  <!-- Desktop: Modal centrado -->
  <UModal
    v-if="!isMobile"
    :open="isOpen"
    :title="t('contact.title')"
    :ui="{ content: 'sm:max-w-lg' }"
    @update:open="
      (val) => {
        if (!val) close()
      }
    "
  >
    <template #body>
      <ContactFormBody
        :form="form"
        :intent="intent"
        :is-loading="isLoading"
        :is-provider-intent="isProviderIntent"
        :prefill-activity-title="prefillActivityTitle"
        :business-name="businessName"
        :brief-desc="briefDesc"
        @submit="handleSubmit"
        @cancel="close"
        @update:intent="intent = $event as ContactIntent"
        @update:business-name="businessName = $event"
        @update:brief-desc="briefDesc = $event"
        @update:name="form.name = $event"
        @update:email="form.email = $event"
        @update:message="form.message = $event"
      />
    </template>
  </UModal>

  <!-- Mobile: Drawer desde abajo -->
  <UiDrawer v-else v-model:open="isOpen" :title="t('contact.title')" direction="bottom">
    <template #body>
      <ContactFormBody
        :form="form"
        :intent="intent"
        :is-loading="isLoading"
        :is-provider-intent="isProviderIntent"
        :prefill-activity-title="prefillActivityTitle"
        :business-name="businessName"
        :brief-desc="briefDesc"
        @submit="handleSubmit"
        @cancel="close"
        @update:intent="intent = $event as ContactIntent"
        @update:business-name="businessName = $event"
        @update:brief-desc="briefDesc = $event"
        @update:name="form.name = $event"
        @update:email="form.email = $event"
        @update:message="form.message = $event"
      />
    </template>
  </UiDrawer>
</template>
