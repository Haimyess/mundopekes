<script setup lang="ts">
const { t } = useI18n()

withDefaults(
  defineProps<{
    count?: number
  }>(),
  {
    count: 0,
  }
)

const open = ref(false)

async function onSubmit() {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('customers.deleteModal.title', { count })"
    :description="t('customers.deleteModal.description')"
  >
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('customers.deleteModal.cancel')"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          :label="t('customers.deleteModal.confirm')"
          color="error"
          variant="solid"
          loading-auto
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
