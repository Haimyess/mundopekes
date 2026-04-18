<script setup lang="ts">
const props = defineProps<{
  count: number
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
}>()

const open = ref(false)
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Eliminar ${count} actividad${count > 1 ? 'es' : ''}`"
    description="Esta acción no se puede deshacer."
  >
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          label="Eliminar"
          color="error"
          variant="solid"
          :loading="loading"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </UModal>
</template>
