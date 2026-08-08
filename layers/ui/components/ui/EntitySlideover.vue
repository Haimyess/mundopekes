<script setup lang="ts">
// Shell compartido por los drawers de edición de entidades (Activities, Places,
// Suggestions) — mismo ancho y mismo comportamiento de cierre en los tres.
// `open` es opcional: se deja undefined cuando el padre usa overlay.create()
// (el slideover queda no controlado), o se pasa explícito cuando el padre lo
// renderiza inline (caso Suggestions).
interface Props {
  title: string
  open?: boolean
  ui?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  ui: () => ({ content: 'sm:max-w-xl' }),
})

const emit = defineEmits<{
  close: []
  'update:open': [value: boolean]
}>()
</script>

<template>
  <USlideover
    :open="props.open"
    :title="props.title"
    :ui="props.ui"
    :close="{ onClick: () => emit('close') }"
    @update:open="
      (val: boolean) => {
        if (!val) emit('close')
        emit('update:open', val)
      }
    "
  >
    <template v-if="$slots.body" #body>
      <slot name="body" />
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </USlideover>
</template>
