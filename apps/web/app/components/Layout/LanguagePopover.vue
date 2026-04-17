<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Ref para detectar clicks fuera
const popoverRef = ref<HTMLElement | null>(null)

// Cerrar al hacer click fuera
onClickOutside(popoverRef, () => {
  if (isOpen.value) {
    isOpen.value = false
  }
})

const close = () => {
  isOpen.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        ref="popoverRef"
        class="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-50 w-72 overflow-hidden"
        :style="{
          top: 'var(--popover-top)',
          left: 'var(--popover-left)',
        }"
      >
        <!-- Content -->
        <div class="p-2">
          <slot :close="close" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
</style>