<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md'
})

// Mapear correctamente a los colores que UBadge acepta
const uiColor = computed(() => {
  switch (props.variant) {
    case 'primary': return 'primary'
    case 'secondary': return 'neutral'  // ← 'neutral' en lugar de 'gray'
    case 'success': return 'success'    // ← 'success' en lugar de 'green'
    case 'warning': return 'warning'    // ← 'warning' en lugar de 'yellow'
    case 'error': return 'error'        // ← 'error' en lugar de 'red'
    case 'info': return 'info'          // ← 'info' en lugar de 'blue'
    default: return 'primary'
  }
})
</script>

<template>
  <UBadge
    :color="uiColor"
    :size="size"
  >
    <slot />
  </UBadge>
</template>

<style scoped>
</style>