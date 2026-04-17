<script setup lang="ts">
interface Props {
  title?: string
  description?: string
  direction?: 'bottom' | 'top' | 'left' | 'right'
  handle?: boolean
  open?: boolean
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  direction: 'bottom',
  handle: true,
  maxHeight: '85vh'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<template>
  <UDrawer
    :open="open"
    :title="title"
    :description="description"
    :direction="direction"
    :handle="handle"
    
    :ui="{
      content: `flex flex-col max-h-[${maxHeight}]`,
      body: 'flex flex-col flex-1 min-h-0 p-0'
    }"
    @update:open="emit('update:open', $event)"
  >
    <slot />
    <template v-if="$slots.body" #body>
      <slot name="body" />
    </template>
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UDrawer>
</template>