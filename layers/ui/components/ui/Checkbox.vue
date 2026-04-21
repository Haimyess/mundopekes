<script setup lang="ts">
interface Props {
  modelValue?: boolean
  label?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false, // ← Valor por defecto
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const internalValue = computed({
  get: () => props.modelValue ?? false, // ← Fallback a false
  set: (value: boolean) => emit('update:modelValue', value), // ← Tipo explícito
})
</script>

<template>
  <UCheckbox v-model="internalValue" :label="label" :disabled="disabled" />
</template>
