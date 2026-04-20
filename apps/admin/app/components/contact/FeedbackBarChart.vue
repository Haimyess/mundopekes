<script setup lang="ts">
interface MonthData {
  month: string
  count: number
}

interface Props {
  data: MonthData[]
}

const props = defineProps<Props>()

const maxCount = computed(() => Math.max(...props.data.map((d) => d.count), 1))

const formatMonth = (month: string) => {
  const [year, m] = month.split('-')
  const date = new Date(Number(year), Number(m) - 1, 1)
  return date.toLocaleString('es-AR', { month: 'short' })
}
</script>

<template>
  <div class="flex items-end gap-2 h-24">
    <div
      v-for="item in data"
      :key="item.month"
      class="flex flex-col items-center gap-1 flex-1 min-w-0"
    >
      <span class="text-xs font-medium text-(--ui-text-muted)">{{ item.count }}</span>
      <div
        class="w-full rounded-t bg-primary transition-all duration-500"
        :style="{
          height: `${(item.count / maxCount) * 56}px`,
          minHeight: item.count > 0 ? '4px' : '0',
        }"
      />
      <span class="text-[10px] text-(--ui-text-muted) truncate w-full text-center">
        {{ formatMonth(item.month) }}
      </span>
    </div>
  </div>
</template>
