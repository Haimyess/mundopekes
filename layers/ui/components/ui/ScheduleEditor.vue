<script setup lang="ts">
// Editor de horario por día (toggle abierto/cerrado + hora inicio/fin), portado del
// wizard del frontend (StepDetalles). Muestra los horarios de Google como vista
// principal (read-only) cuando existen, con opción de editar manualmente, y un toggle
// "horarios desconocidos". v-model:schedule + v-model:hoursUnknown.
import {
  SCHEDULE_DAYS,
  type WizardSchedule,
  type ScheduleDay,
} from '../../../domain/types/schedule'

const props = withDefaults(
  defineProps<{
    schedule: WizardSchedule
    hoursUnknown?: boolean
    // Texto de horarios de Google (líneas separadas por \n), si está disponible
    googleHoursText?: string
  }>(),
  {
    hoursUnknown: false,
    googleHoursText: '',
  }
)

const emit = defineEmits<{
  'update:schedule': [value: WizardSchedule]
  'update:hoursUnknown': [value: boolean]
}>()

const DAY_LABELS: Record<keyof WizardSchedule, string> = {
  sunday: 'Domingo',
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
}

const days = computed(() => SCHEDULE_DAYS.map((key) => ({ key, label: DAY_LABELS[key] })))

const googleHoursLines = computed(() =>
  props.googleHoursText ? props.googleHoursText.split('\n').filter(Boolean) : []
)
const hasGoogleHours = computed(() => googleHoursLines.value.length > 0)

const showManualEditor = ref(false)

const hoursUnknownProxy = computed({
  get: () => props.hoursUnknown,
  set: (val: boolean) => emit('update:hoursUnknown', val),
})

const updateDay = (key: keyof WizardSchedule, patch: Partial<ScheduleDay>) => {
  emit('update:schedule', {
    ...props.schedule,
    [key]: { ...props.schedule[key], ...patch },
  })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-(--ui-text-muted)">Horario</span>
      <UCheckbox v-model="hoursUnknownProxy" label="Horarios desconocidos" />
    </div>

    <template v-if="!hoursUnknownProxy">
      <!-- Vista de horarios de Google (read-only) -->
      <template v-if="hasGoogleHours && !showManualEditor">
        <div
          class="flex flex-col gap-0.5 rounded-md border border-(--ui-border) bg-(--ui-bg-muted) p-3"
        >
          <p v-for="(line, i) in googleHoursLines" :key="i" class="text-xs text-(--ui-text-muted)">
            {{ line }}
          </p>
        </div>
        <button
          type="button"
          class="self-start text-xs text-primary-500 underline underline-offset-2"
          @click="showManualEditor = true"
        >
          Editar manualmente
        </button>
      </template>

      <!-- Editor por día -->
      <template v-else>
        <button
          v-if="hasGoogleHours"
          type="button"
          class="self-start text-xs text-primary-500 underline underline-offset-2 mb-1"
          @click="showManualEditor = false"
        >
          ← Volver a horarios de Google
        </button>

        <div class="flex flex-col gap-2">
          <div
            v-for="day in days"
            :key="day.key"
            class="grid items-center gap-2"
            style="grid-template-columns: 16px 80px 1fr auto 1fr"
          >
            <button
              type="button"
              class="size-4 rounded-full border-[1.5px] transition-colors"
              :class="
                schedule[day.key].open
                  ? 'bg-primary-500 border-primary-500'
                  : 'border-(--ui-border-accented) bg-transparent'
              "
              @click="updateDay(day.key, { open: !schedule[day.key].open })"
            />
            <span
              class="text-xs font-medium"
              :class="schedule[day.key].open ? 'text-(--ui-text)' : 'text-(--ui-text-dimmed)'"
            >
              {{ day.label }}
            </span>
            <input
              :value="schedule[day.key].start"
              type="time"
              class="w-full rounded-md border border-(--ui-border) bg-(--ui-bg) px-1.5 py-1 text-xs outline-none disabled:opacity-35"
              :disabled="!schedule[day.key].open"
              @input="updateDay(day.key, { start: ($event.target as HTMLInputElement).value })"
            />
            <span class="text-center text-xs text-(--ui-text-dimmed)">–</span>
            <input
              :value="schedule[day.key].end"
              type="time"
              class="w-full rounded-md border border-(--ui-border) bg-(--ui-bg) px-1.5 py-1 text-xs outline-none disabled:opacity-35"
              :disabled="!schedule[day.key].open"
              @input="updateDay(day.key, { end: ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
