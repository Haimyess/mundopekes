<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <div class="bg-elevated rounded-2xl border border-default p-5 sm:p-6 flex flex-col gap-4">
    <div v-if="title || $slots.actions" class="flex items-start justify-between gap-3">
      <div v-if="title" class="flex flex-col gap-0.5">
        <h2 class="text-sm font-semibold text-highlighted">{{ title }}</h2>
        <p v-if="subtitle" class="text-xs text-(--ui-text-muted)">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>
