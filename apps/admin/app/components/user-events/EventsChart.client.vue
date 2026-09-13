<script setup lang="ts">
import { eachWeekOfInterval, eachMonthOfInterval, endOfWeek, endOfMonth, format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { VisXYContainer, VisLine, VisArea, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { Period } from '~/types'

const { locale } = useI18n()
const dateFnsLocale = computed(() => (locale.value === 'en' ? enUS : es))

const props = defineProps<{
  data: { day: string; count: number }[]
  period: Period
}>()

const containerRef = useTemplateRef<HTMLElement | null>('containerRef')
const { width } = useElementSize(containerRef)

type DataRecord = { date: Date; count: number }

const dailyData = computed<DataRecord[]>(() =>
  props.data.map((d) => ({ date: new Date(d.day), count: d.count }))
)

// El endpoint siempre manda la serie diaria (ya rellenada en cero por SQL);
// para weekly/monthly se re-agrupa acá sumando los días de cada bucket,
// mismo enfoque que HomeChart.client.vue pero sobre conteos reales en vez de
// datos al azar.
const bucketedData = computed<DataRecord[]>(() => {
  const days = dailyData.value
  if (props.period === 'daily' || days.length === 0) return days

  const first = days[0]!.date
  const last = days[days.length - 1]!.date
  const starts =
    props.period === 'weekly'
      ? eachWeekOfInterval({ start: first, end: last })
      : eachMonthOfInterval({ start: first, end: last })

  return starts.map((start) => {
    const end = props.period === 'weekly' ? endOfWeek(start) : endOfMonth(start)
    const count = days
      .filter((d) => d.date >= start && d.date <= end)
      .reduce((sum, d) => sum + d.count, 0)
    return { date: start, count }
  })
})

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.count

const formatDate = (date: Date): string =>
  ({
    daily: format(date, 'd MMM', { locale: dateFnsLocale.value }),
    weekly: format(date, 'd MMM', { locale: dateFnsLocale.value }),
    monthly: format(date, 'MMM yyy', { locale: dateFnsLocale.value }),
  })[props.period]

const xTicks = (i: number) => {
  const data = bucketedData.value
  if (i === 0 || i === data.length - 1 || !data[i]) return ''
  return formatDate(data[i]!.date)
}

const template = (d: DataRecord) => `${formatDate(d.date)}: ${d.count.toLocaleString(locale.value)}`
</script>

<template>
  <div ref="containerRef">
    <VisXYContainer :data="bucketedData" :padding="{ top: 20 }" class="h-80" :width="width">
      <VisLine :x="x" :y="y" color="var(--ui-primary)" />
      <VisArea :x="x" :y="y" color="var(--ui-primary)" :opacity="0.1" />

      <VisAxis type="x" :x="x" :tick-format="xTicks" />

      <VisCrosshair color="var(--ui-primary)" :template="template" />

      <VisTooltip />
    </VisXYContainer>
  </div>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
