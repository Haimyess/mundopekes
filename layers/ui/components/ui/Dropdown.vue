<script setup lang="ts">
import type { DropdownItem, ButtonVariant } from '~/types/ui'

interface Props {
  items: DropdownItem[][]
  buttonLabel?: string
  buttonIcon?: string
  buttonVariant?: ButtonVariant
}

withDefaults(defineProps<Props>(), {
  buttonVariant: 'ghost',
})
</script>

<template>
  <UDropdown :items="items">
    <UiButton :variant="buttonVariant" :icon="buttonIcon" icon-right="i-heroicons-chevron-down">
      {{ buttonLabel }}
    </UiButton>
  </UDropdown>
</template>
