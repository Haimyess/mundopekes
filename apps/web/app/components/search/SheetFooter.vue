<script setup lang="ts">
interface Props {
  confirmLabel: string
  isConfirmLoading?: boolean
}

withDefaults(defineProps<Props>(), { isConfirmLoading: false })

const emit = defineEmits<{ clear: []; confirm: [] }>()

const { t } = useI18n()

const handleClear = () => emit('clear')
const handleConfirm = () => emit('confirm')
</script>

<template>
  <div class="sheet-footer">
    <UiButton variant="link" @click="handleClear">{{ t('results.actions.clear') }}</UiButton>
    <UiButton :loading="isConfirmLoading" @click="handleConfirm">{{ confirmLabel }}</UiButton>
  </div>
</template>

<style scoped>
.sheet-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  inline-size: 100%;
}
</style>
