<script setup lang="ts">
interface Props {
  modelValue?: string // ← Solo string, no number
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  placeholder?: string
  disabled?: boolean
  required?: boolean
  icon?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string] // ← Solo string
}>()

const internalValue = computed({
  get: () => props.modelValue ?? '',
  set: (value: string) => emit('update:modelValue', value), // ← Solo string
})
</script>

<template>
  <UInput
    v-model="internalValue"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :required="required"
    :icon="icon"
    :size="size"
    class="w-full"
  />
</template>
