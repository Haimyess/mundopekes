<script setup lang="ts">
import { parseDate, today, type CalendarDate, type DateValue } from '@internationalized/date'

interface Props {
  label: string
  timeZone?: string
  isPastDisabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  timeZone: 'Asia/Jerusalem',
  isPastDisabled: true,
})

const modelValue = defineModel<string | null>({ default: null })

const SUNDAY = 0
const WEEKEND_DAYS = new Set([5, 6])

const minimumDate = computed(() => (props.isPastDisabled ? today(props.timeZone) : undefined))

const selectedDate = computed({
  get: () => (modelValue.value ? parseDate(modelValue.value) : undefined),
  set: (value: CalendarDate | undefined) => {
    modelValue.value = value ? value.toString() : null
  },
})

const isWeekend = (day: DateValue) => WEEKEND_DAYS.has(day.toDate('UTC').getUTCDay())
</script>

<template>
  <UCalendar
    v-model="selectedDate"
    :aria-label="label"
    :week-starts-on="SUNDAY"
    :min-value="minimumDate"
    fixed-weeks
    :ui="{
      root: 'ui-calendar',
      heading: 'ui-calendar__heading',
      headCell: 'ui-calendar__head-cell',
      cellTrigger: 'ui-calendar__day',
    }"
  >
    <template #day="{ day }">
      <span :class="{ 'ui-calendar__weekend': isWeekend(day) }">{{ day.day }}</span>
    </template>
  </UCalendar>
</template>

<style>
.ui-calendar {
  color: var(--mp-ink);
  font-family: var(--mp-font);
}

.ui-calendar__heading {
  font-size: var(--mp-fs-body-lg);
  font-weight: var(--mp-fw-bold);
}

.ui-calendar__head-cell {
  color: var(--mp-text-3);
  font-size: var(--mp-fs-label);
  font-weight: var(--mp-fw-semibold);
}

.ui-calendar__day {
  min-inline-size: var(--mp-tap);
  min-block-size: var(--mp-tap);
  border-radius: var(--mp-r-pill);
  font-size: var(--mp-fs-body);
}

.ui-calendar__day:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 1px;
}

.ui-calendar__day[data-selected] {
  background: var(--mp-ink);
  color: var(--mp-surface);
}

.ui-calendar__day[data-disabled] {
  color: var(--mp-text-3);
  opacity: 0.45;
}

.ui-calendar__weekend {
  color: var(--mp-coral-700);
}

.ui-calendar__day[data-selected] .ui-calendar__weekend {
  color: inherit;
}
</style>
