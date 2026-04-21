<script setup lang="ts">
interface Props {
  title?: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <UCard>
    <template v-if="title || $slots.header" #header>
      <slot name="header">
        <h3 v-if="title" class="text-lg font-semibold">{{ title }}</h3>
        <p v-if="description" class="text-sm text-gray-500 mt-1">{{ description }}</p>
      </slot>
    </template>

    <slot />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UCard>
</template>

<style scoped></style>
