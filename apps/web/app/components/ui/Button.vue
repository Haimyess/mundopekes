<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  disabled?: boolean
  block?: boolean
  icon?: string
  iconRight?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  block: false
})

// Mapear variantes personalizadas a colores de Nuxt UI
const uiColor = computed(() => {
  switch (props.variant) {
    case 'primary': return 'primary'
    case 'secondary': return 'neutral'
    case 'danger': return 'error'  // ← 'error' en lugar de 'red'
    case 'success': return 'success'
    case 'ghost': return 'neutral'
    default: return 'primary'
  }
})

const uiVariant = computed(() => {
  if (props.variant === 'ghost') {
    return 'ghost'
  }
  return 'solid'
})
</script>

<template>
  <UButton
    :color="uiColor"
    :variant="uiVariant"
    :size="size"
    :loading="loading"
    :disabled="disabled"
    :block="block"
    :icon="icon"
    :trailing-icon="iconRight"
  >
    <slot />
  </UButton>
</template>