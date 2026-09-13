<script setup lang="ts">
interface RankItem {
  label: string
  value: number
  sublabel?: string
  to?: string
}

const props = defineProps<{
  items: RankItem[]
}>()

const maxValue = computed(() => Math.max(1, ...props.items.map((i) => i.value)))
</script>

<template>
  <ol class="flex flex-col gap-4">
    <li
      v-for="(item, index) in items"
      :key="`${index}-${item.label}`"
      class="flex items-center gap-3"
    >
      <span
        class="flex items-center justify-center size-8 rounded-full text-sm font-semibold shrink-0"
        :class="
          index === 0
            ? 'bg-primary text-inverted'
            : 'bg-elevated border border-default text-(--ui-text-muted)'
        "
      >
        {{ index + 1 }}
      </span>
      <div class="flex-1 min-w-0 flex flex-col gap-1.5">
        <div class="flex items-baseline justify-between gap-2">
          <NuxtLink
            v-if="item.to"
            :to="item.to"
            class="text-sm font-medium truncate hover:underline text-highlighted"
          >
            {{ item.label }}
          </NuxtLink>
          <span v-else class="text-sm font-medium truncate">{{ item.label }}</span>
          <span class="text-sm font-semibold tabular-nums shrink-0">{{
            item.value.toLocaleString()
          }}</span>
        </div>
        <div class="h-2 rounded-full bg-default overflow-hidden">
          <div
            class="h-full rounded-full bg-primary/70 transition-all duration-300"
            :style="{ width: `${(item.value / maxValue) * 100}%` }"
          />
        </div>
        <span v-if="item.sublabel" class="text-xs text-(--ui-text-muted)">{{ item.sublabel }}</span>
      </div>
    </li>
  </ol>
</template>
