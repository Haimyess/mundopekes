<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()

function buildSchema() {
  return z.object({
    name: z.string().min(2, t('customers.addModal.nameTooShort')),
    email: z.string().email(t('customers.addModal.emailInvalid')),
  })
}

type Schema = z.output<ReturnType<typeof buildSchema>>

const schema = computed(() => buildSchema())

const open = ref(false)

const state = reactive<Partial<Schema>>({
  name: '',
  email: '',
})

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({
    title: t('customers.addModal.toastSuccessTitle'),
    description: t('customers.addModal.toastSuccessDescription', { name: event.data.name }),
    color: 'success',
  })
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('customers.addModal.title')"
    :description="t('customers.addModal.description')"
  >
    <UButton :label="t('customers.addModal.openButton')" icon="i-lucide-plus" />

    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField
          :label="t('customers.addModal.nameLabel')"
          :placeholder="t('customers.addModal.namePlaceholder')"
          name="name"
        >
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField
          :label="t('customers.addModal.emailLabel')"
          :placeholder="t('customers.addModal.emailPlaceholder')"
          name="email"
        >
          <UInput v-model="state.email" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('customers.addModal.cancel')"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            :label="t('customers.addModal.create')"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
