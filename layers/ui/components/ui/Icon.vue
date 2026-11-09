<script setup lang="ts">
export type IconPixelSize = 14 | 16 | 20 | 24 | 32 | 40
export type IconNamedSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface Props {
  name: string
  size?: IconPixelSize | IconNamedSize
  label?: string
  mirrorInRtl?: boolean
}

const NAMED_SIZES: Record<IconNamedSize, IconPixelSize> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
}

const props = withDefaults(defineProps<Props>(), {
  size: 20,
  label: undefined,
  mirrorInRtl: false,
})

const pixelSize = computed(() =>
  typeof props.size === 'number' ? props.size : NAMED_SIZES[props.size]
)

const accessibilityAttributes = computed(() =>
  props.label ? { role: 'img', 'aria-label': props.label } : { 'aria-hidden': 'true' }
)
</script>

<template>
  <UIcon
    :name="name"
    class="ui-icon"
    :class="{ 'ui-icon--mirror-rtl': mirrorInRtl }"
    :style="{ '--ui-icon-size': `${pixelSize}px` }"
    v-bind="accessibilityAttributes"
  />
</template>

<style scoped>
.ui-icon {
  inline-size: var(--ui-icon-size);
  block-size: var(--ui-icon-size);
  flex-shrink: 0;
}

.ui-icon--mirror-rtl:dir(rtl) {
  transform: scaleX(-1);
}
</style>
