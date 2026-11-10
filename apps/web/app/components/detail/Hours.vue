<script setup lang="ts">
import { formatMinutes, WEEKDAYS, type Weekday } from '@mundopekes/core'
import type { DetailHours } from '#shared/types/detail'

interface Props {
  hours: DetailHours
}

const props = defineProps<Props>()

const SUNDAY_REFERENCE = Date.UTC(2026, 0, 4)
const MS_PER_DAY = 86_400_000
const FULL_DAY_MINUTES = 1440

const { t, locale } = useI18n()

const dayName = (weekday: Weekday) =>
  new Intl.DateTimeFormat(locale.value, { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(SUNDAY_REFERENCE + weekday * MS_PER_DAY)
  )

function describeDay(weekday: Weekday): string {
  const intervals = props.hours.weekly?.[weekday]
  if (intervals === undefined) return t('detail.unknownHours')
  if (intervals.length === 0) return t('detail.closed')
  if (
    intervals.length === 1 &&
    intervals[0]!.start === 0 &&
    intervals[0]!.end >= FULL_DAY_MINUTES
  ) {
    return t('detail.alwaysOpen')
  }
  return intervals
    .map(({ start, end }) => `${formatMinutes(start)}–${formatMinutes(end)}`)
    .join(', ')
}

const rows = computed(() =>
  (Object.values(WEEKDAYS) as Weekday[]).map((weekday) => ({
    weekday,
    name: dayName(weekday),
    description: describeDay(weekday),
    isToday: weekday === props.hours.today,
  }))
)
</script>

<template>
  <table v-if="hours.weekly" class="detail-hours">
    <caption class="detail-hours__caption">
      {{
        t('detail.hours')
      }}
    </caption>
    <tbody>
      <tr
        v-for="row in rows"
        :key="row.weekday"
        class="detail-hours__row"
        :class="{ 'detail-hours__row--today': row.isToday }"
        :aria-current="row.isToday ? 'date' : undefined"
      >
        <th scope="row" class="detail-hours__day">
          {{ row.name }}
          <span v-if="row.isToday" class="detail-hours__today">{{ t('detail.today') }}</span>
        </th>
        <td class="detail-hours__time">
          <bdi>{{ row.description }}</bdi>
        </td>
      </tr>
    </tbody>
  </table>
  <p v-else class="detail-hours__empty">{{ t('detail.unknownHours') }}</p>
</template>

<style scoped>
.detail-hours {
  inline-size: 100%;
  border-collapse: collapse;
  font-size: var(--mp-fs-body-sm);
}

.detail-hours__caption {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.detail-hours__row {
  border-block-end: 1px solid var(--mp-border-soft);
}

.detail-hours__day,
.detail-hours__time {
  padding-block: 8px;
  text-align: start;
  font-weight: var(--mp-fw-regular);
}

.detail-hours__time {
  text-align: end;
  color: var(--mp-text-2);
}

.detail-hours__row--today .detail-hours__day,
.detail-hours__row--today .detail-hours__time {
  color: var(--mp-ink);
  font-weight: var(--mp-fw-bold);
}

.detail-hours__today {
  margin-inline-start: 6px;
  padding: 1px 8px;
  border-radius: var(--mp-r-pill);
  background: var(--mp-ink);
  color: var(--mp-surface);
  font-size: var(--mp-fs-label-sm);
}

.detail-hours__empty {
  margin: 0;
  color: var(--mp-text-2);
}
</style>
