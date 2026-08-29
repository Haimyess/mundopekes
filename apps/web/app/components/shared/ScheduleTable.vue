<script setup lang="ts">
interface ScheduleRow {
  key: string | number
  label: string
  hours: string
  open: boolean | null
  isToday: boolean
}

interface Props {
  rows: ScheduleRow[]
  openNow?: boolean | null
}

withDefaults(defineProps<Props>(), {
  openNow: null,
})
</script>

<template>
  <table class="schedule-table">
    <tbody>
      <tr
        v-for="entry in rows"
        :key="entry.key"
        class="schedule-table__row"
        :class="{ 'schedule-table__row--today': entry.isToday }"
      >
        <td class="schedule-table__day">{{ entry.label }}</td>
        <td
          class="schedule-table__time"
          :class="{
            'schedule-table__time--closed': entry.open === false,
            'schedule-table__time--open-now': entry.isToday && openNow === true,
          }"
        >
          {{ entry.hours }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.schedule-table {
  width: 100%;
  border-collapse: collapse;
}

.schedule-table__row {
  border-bottom: 1px solid var(--color-neutral-200, #e5e5e5);
}

.schedule-table__row:last-child {
  border-bottom: none;
}

/* Día actual: fondo verde suave + texto verde */
.schedule-table__row--today .schedule-table__day,
.schedule-table__row--today .schedule-table__time {
  color: var(--color-secondary-600, #16a34a);
}

.schedule-table__row--today {
  background: var(--color-secondary-50, #f0fdf4);
}

.schedule-table__day {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  padding: var(--space-2) var(--space-3) var(--space-2) 0;
  white-space: nowrap;
  width: 40%;
}

.schedule-table__time {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--space-2) 0;
}

.schedule-table__time--closed {
  color: var(--color-neutral-400, #a3a3a3);
  font-style: italic;
}

.schedule-table__time--open-now {
  color: var(--color-secondary-600, #16a34a);
  font-weight: var(--font-weight-bold);
}
</style>
