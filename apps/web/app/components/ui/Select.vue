<script setup lang="ts">
interface Option {
  label: string
  value: string | number
  disabled?: boolean
}

interface Props {
  options: Option[]
  placeholder?: string
  disabled?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

withDefaults(defineProps<Props>(), {
  size: 'md'
})

// Cambiamos null por undefined, que es lo que acepta USelect
const model = defineModel<string | number | undefined>({ default: undefined })
</script>

<template>
  <USelect
    v-model="model"
    :items="options"
    :placeholder="placeholder"
    :disabled="disabled"
    :size="size"
  />
</template>