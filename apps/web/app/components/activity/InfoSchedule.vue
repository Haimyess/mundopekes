<script setup lang="ts">
/**
 * Activity > InfoSchedule
 * Horario con acordeón expandible.
 * Muestra estado actual (abierto/cerrado) + hora de cierre/apertura.
 * Al expandir muestra todos los días.
 *
 * El campo `schedule` es texto libre de la DB.
 * Si en el futuro tienes horarios estructurados por día, actualiza `parsedDays`.
 */

interface Props {
  schedule: string
}

const props = defineProps<Props>()
const { t } = useI18n()

const isExpanded = ref(false)

/**
 * Intenta parsear el schedule como JSON con días de semana.
 * Formato esperado (opcional):
 * {
 *   "monday": "09:00-18:00",
 *   "tuesday": "09:00-18:00",
 *   "saturday": "closed"
 * }
 * Si no es JSON válido, muestra el texto tal cual.
 */
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const DAY_LABELS = computed<Record<string, string>>(() => ({
  sunday: t('common.day_sunday'),
  monday: t('common.day_monday'),
  tuesday: t('common.day_tuesday'),
  wednesday: t('common.day_wednesday'),
  thursday: t('common.day_thursday'),
  friday: t('common.day_friday'),
  saturday: t('common.day_saturday'),
}))

const parsedDays = computed(() => {
  try {
    const obj = JSON.parse(props.schedule)
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      return DAY_KEYS.map((key) => ({
        key,
        label: DAY_LABELS.value[key] ?? key,
        hours: obj[key] ?? null,
      }))
    }
  } catch {
    /* not structured JSON */
  }
  return null
})

const isStructured = computed(() => parsedDays.value !== null)

// ─── Estado actual (solo para horarios estructurados) ─────────
const todayKey = computed(() => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date().getDay()]
})

const todayHours = computed(() => {
  if (!parsedDays.value) return null
  return parsedDays.value.find((d) => d.key === todayKey.value) ?? null
})

const isClosed = computed(() => {
  if (!todayHours.value?.hours) return true
  const h = todayHours.value.hours.toLowerCase()
  return h === 'closed' || h === 'cerrado'
})

const statusLabel = computed(() =>
  isClosed.value ? t('activity.closed_now') : t('activity.open_now')
)
const statusColor = computed(() =>
  isClosed.value ? 'info-schedule__status--closed' : 'info-schedule__status--open'
)
const todayDisplay = computed(() => {
  if (!todayHours.value?.hours) return ''
  const h = todayHours.value.hours.toLowerCase()
  return h === 'closed' || h === 'cerrado' ? '' : todayHours.value.hours
})
</script>

<template>
  <div class="info-section">
    <!-- ─── Header del acordeón ───────────────────────────── -->
    <button
      class="info-schedule__trigger"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <div class="info-schedule__trigger-left">
        <UIcon name="i-heroicons-clock" class="info-schedule__clock-icon" />
        <div class="info-schedule__status">
          <template v-if="isStructured">
            <span class="info-schedule__status-label" :class="statusColor">
              {{ statusLabel }}
            </span>
            <span v-if="todayDisplay" class="info-schedule__status-hours">
              {{ todayDisplay }}
            </span>
          </template>
          <template v-else>
            <span class="info-schedule__status-label">{{ t('activity.schedule') }}</span>
          </template>
        </div>
      </div>
      <div class="info-schedule__trigger-right">
        <span class="info-schedule__all-hours">{{ t('activity.all_hours') }}</span>
        <UIcon
          :name="isExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="info-schedule__chevron"
        />
      </div>
    </button>

    <!-- ─── Contenido expandido ───────────────────────────── -->
    <Transition name="schedule-expand">
      <div v-if="isExpanded" class="info-schedule__body">
        <!-- Días estructurados -->
        <template v-if="isStructured">
          <div
            v-for="day in parsedDays"
            :key="day.key"
            class="info-schedule__day"
            :class="{ 'info-schedule__day--today': day.key === todayKey }"
          >
            <span class="info-schedule__day-label">{{ day.label }}</span>
            <span
              class="info-schedule__day-hours"
              :class="
                !day.hours ||
                day.hours.toLowerCase() === 'closed' ||
                day.hours.toLowerCase() === 'cerrado'
                  ? 'text-gray-400'
                  : 'text-gray-700'
              "
            >
              {{
                !day.hours ||
                day.hours.toLowerCase() === 'closed' ||
                day.hours.toLowerCase() === 'cerrado'
                  ? t('activity.closed')
                  : day.hours
              }}
            </span>
          </div>
        </template>

        <!-- Texto libre -->
        <template v-else>
          <p class="info-schedule__free-text">{{ schedule }}</p>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Card base ───────────────────────────────────────────────── */
.info-section {
  overflow: hidden;
}

/* ── Trigger (botón acordeón) ────────────────────────────────── */
.info-schedule__clock-icon {
  width: 1rem;
  height: 1rem;
  color: var(--color-secondary-600, #16a34a);
  flex-shrink: 0;
}

.info-schedule__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  text-align: start;
}

.info-schedule__status--open {
  color: var(--color-secondary-600, #16a34a);
}
.info-schedule__status--closed {
  color: var(--color-neutral-500, #737373);
}

.info-schedule__trigger-left {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
}

.info-schedule__trigger-right {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  flex-shrink: 0;
}

.info-schedule__status {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.info-schedule__status-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
}

.info-schedule__status-hours {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.2;
}

.info-schedule__all-hours {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.info-schedule__chevron {
  width: 1rem;
  height: 1rem;
  color: var(--color-text-secondary);
  transition: transform var(--transition-fast);
}

/* ── Body expandido ──────────────────────────────────────────── */
.info-schedule__body {
  border-top: 1px solid var(--color-neutral-100);
  padding: var(--space-2) 0;
}

.info-schedule__day {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-5);
  font-size: var(--font-size-sm);
  transition: background var(--transition-fast);
}

.info-schedule__day--today {
  background: var(--color-primary-50);
  font-weight: var(--font-weight-semibold);
}

.info-schedule__day--today .info-schedule__day-label {
  color: var(--color-primary-700);
}

.info-schedule__day-label {
  color: var(--color-text-secondary);
}

.info-schedule__day-hours {
  font-weight: var(--font-weight-medium);
}

.info-schedule__free-text {
  padding: var(--space-4) var(--space-5);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  white-space: pre-line;
  margin: 0;
}

/* ── Animación acordeón ──────────────────────────────────────── */
.schedule-expand-enter-active,
.schedule-expand-leave-active {
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;
  overflow: hidden;
  max-height: 500px;
}

.schedule-expand-enter-from,
.schedule-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
