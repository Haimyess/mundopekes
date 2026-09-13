<script setup lang="ts">
interface DayValue {
  label: string
  value: number
  isPeak: boolean
}

defineProps<{
  days: DayValue[]
  peakCaption?: string
}>()

const maxValue = (days: DayValue[]) => Math.max(1, ...days.map((d) => d.value))
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="peakCaption" class="flex flex-col">
      <span class="text-2xl font-bold tabular-nums">{{
        days.find((d) => d.isPeak)?.value.toLocaleString() ?? 0
      }}</span>
      <span class="text-xs text-(--ui-text-muted)">{{ peakCaption }}</span>
    </div>
    <div class="flex items-end justify-between gap-2 h-32">
      <div
        v-for="day in days"
        :key="day.label"
        class="flex-1 flex flex-col items-center gap-2 h-full justify-end"
      >
        <div
          class="w-full rounded-t-md transition-all duration-300"
          :class="day.isPeak ? 'bg-primary' : 'bg-default border border-default'"
          :style="{ height: `${Math.max(6, (day.value / maxValue(days)) * 100)}%` }"
        />
        <span
          class="text-xs"
          :class="day.isPeak ? 'text-highlighted font-semibold' : 'text-(--ui-text-muted)'"
        >
          {{ day.label }}
        </span>
      </div>
    </div>
  </div>
</template>
