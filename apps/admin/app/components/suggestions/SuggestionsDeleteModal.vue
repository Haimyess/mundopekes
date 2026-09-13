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
    ? t('suggestionsDeleteModal.titlePlural', { count: props.count })
    : t('suggestionsDeleteModal.titleSingular', { count: props.count })
)
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="t('suggestionsDeleteModal.description')">
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('suggestionsDeleteModal.cancel')"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          :label="t('suggestionsDeleteModal.confirm')"
          color="error"
          variant="solid"
          :loading="loading"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
