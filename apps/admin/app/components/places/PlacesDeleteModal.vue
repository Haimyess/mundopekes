<script setup lang="ts">
const props = defineProps<{
  count: number
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
}>()

const { t } = useI18n()
const open = ref(false)

const title = computed(() =>
  props.count > 1
    ? t('placesDeleteModal.titlePlural', { count: props.count })
    : t('placesDeleteModal.titleSingular', { count: props.count })
)
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="t('placesDeleteModal.description')">
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('placesDeleteModal.cancel')"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          :label="t('placesDeleteModal.confirm')"
          color="error"
          variant="solid"
          :loading="loading"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
