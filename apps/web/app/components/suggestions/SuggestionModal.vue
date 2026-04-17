<!-- app/components/suggestions/SuggestionModal.vue -->
<script setup lang="ts">
/**
 * Modal para sugerir una nueva actividad.
 * - Usa los tipos correctos del schema real (suggestions usa string[] para type y best_season)
 * - Geocodifica la dirección automáticamente al enviar
 * - Imports desde '~/types' (re-export central)
 */
import type { CreateSuggestionInput } from '~/types'

const props = defineProps<{ open?: boolean }>()
const emit = defineEmits<{ close: []; 'update:open': [value: boolean] }>()

const { t } = useI18n()
const toast = useToast()
const { submit, submitting } = useSuggestions()

// Strings libres — la tabla suggestions guarda type[] y best_season[] como text[]
// No están atados a un enum, el admin puede agregar los que quiera
const ACTIVITY_TYPES = [
  'parque', 'museo', 'biblioteca', 'indoor', 'outdoor',
  'acuático', 'cultural', 'deportivo', 'educativo', 'granja', 'playa'
]

const SEASONS = ['primavera', 'verano', 'otoño', 'invierno', 'todo el año']

const form = reactive<CreateSuggestionInput>({
  name: '',
  description: '',
  location: { address: '', city: '' },
  age_range: { min: 0, max: 144 },
  type: [],
  best_season: [],
  stroller_friendly: false,
  open_weekends: false,
  is_free: false,
  schedule: '',
  images: []
})

// ─── Toggle helpers ───────────────────────────────────────────
const toggleItem = (arr: string[], value: string) => {
  const idx = arr.indexOf(value)
  if (idx === -1) arr.push(value)
  else arr.splice(idx, 1)
}

const toggleType   = (v: string) => toggleItem(form.type, v)
const toggleSeason = (v: string) => toggleItem(form.best_season, v)

// ─── Validación ───────────────────────────────────────────────
const errors = reactive({
  name: '',
  city: '',
  ageRange: ''
})

const validate = (): boolean => {
  errors.name = ''
  errors.city = ''
  errors.ageRange = ''

  let valid = true

  if (!form.name.trim()) {
    errors.name = t('suggest.error_name')
    valid = false
  }
  if (!form.location.city.trim()) {
    errors.city = t('suggest.error_city')
    valid = false
  }
  if (form.age_range.min < 0 || form.age_range.max > 216 || form.age_range.min > form.age_range.max) {
    errors.ageRange = t('suggest.error_age_range')
    valid = false
  }

  return valid
}

// ─── Submit ───────────────────────────────────────────────────
const handleSubmit = async () => {
  if (!validate()) return

  const result = await submit(form)

  if (result.success) {
    toast.add({ title: t('suggest.success'), color: 'success' })
    emit('update:open', false)
    emit('close')
  } else {
    toast.add({ title: result.error ?? t('common.error'), color: 'error' })
  }
}
</script>

<template>
  <UModal
    :open="props.open"
    :title="t('suggest.title')"
    :close="{ onClick: () => { emit('update:open', false); emit('close') } }"
    :ui="{ content: 'sm:max-w-2xl' }"
    @update:open="(val) => emit('update:open', val)"
  >
    <template #body>
      <div class="suggest-form">

        <!-- ─── Nombre ──────────────────────────────────────── -->
        <UFormField
          :label="t('suggest.name')"
          :error="errors.name"
          required
        >
          <UInput
            v-model="form.name"
            :placeholder="t('suggest.name_placeholder')"
            class="w-full"
          />
        </UFormField>

        <!-- ─── Descripción ───────────────────────────────── -->
        <UFormField :label="t('suggest.description')">
          <UTextarea
            v-model="form.description"
            :placeholder="t('suggest.description_placeholder')"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <!-- ─── Ubicación ─────────────────────────────────── -->
        <div class="suggest-form__row">
          <UFormField
            :label="t('suggest.city')"
            :error="errors.city"
            required
          >
            <UInput
              v-model="form.location.city"
              :placeholder="t('suggest.city_placeholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('suggest.address')">
            <UInput
              v-model="form.location.address"
              :placeholder="t('suggest.address_placeholder')"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- ─── Edad (meses) ──────────────────────────────── -->
        <div class="suggest-form__row">
          <UFormField :label="t('suggest.age_min')">
            <UInput
              v-model.number="form.age_range.min"
              type="number"
              :min="0"
              :max="216"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('suggest.age_max')"
            :error="errors.ageRange"
          >
            <UInput
              v-model.number="form.age_range.max"
              type="number"
              :min="0"
              :max="216"
              class="w-full"
            />
          </UFormField>
        </div>
        <p class="suggest-form__hint">{{ t('suggest.age_hint') }}</p>

        <!-- ─── Tipos ──────────────────────────────────────── -->
        <UFormField :label="t('suggest.types')">
          <div class="suggest-form__chips">
            <UBadge
              v-for="type in ACTIVITY_TYPES"
              :key="type"
              :color="form.type.includes(type) ? 'primary' : 'neutral'"
              :variant="form.type.includes(type) ? 'solid' : 'subtle'"
              class="cursor-pointer select-none"
              @click="toggleType(type)"
            >
              {{ type }}
            </UBadge>
          </div>
        </UFormField>

        <!-- ─── Temporadas ────────────────────────────────── -->
        <UFormField :label="t('suggest.seasons')">
          <div class="suggest-form__chips">
            <UBadge
              v-for="season in SEASONS"
              :key="season"
              :color="form.best_season.includes(season) ? 'info' : 'neutral'"
              :variant="form.best_season.includes(season) ? 'solid' : 'subtle'"
              class="cursor-pointer select-none"
              @click="toggleSeason(season)"
            >
              {{ season }}
            </UBadge>
          </div>
        </UFormField>

        <!-- ─── Horario ────────────────────────────────────── -->
        <UFormField :label="t('suggest.schedule')">
          <UInput
            v-model="form.schedule"
            :placeholder="t('suggest.schedule_placeholder')"
            class="w-full"
          />
        </UFormField>

        <!-- ─── Características ───────────────────────────── -->
        <div>
          <p class="suggest-form__section-label">{{ t('suggest.features') }}</p>
          <div class="suggest-form__checkboxes">
            <UCheckbox
              v-model="form.is_free"
              :label="t('activity.free')"
            />
            <UCheckbox
              v-model="form.stroller_friendly"
              :label="t('activity.stroller_friendly')"
            />
            <UCheckbox
              v-model="form.open_weekends"
              :label="t('activity.open_weekends')"
            />
          </div>
        </div>

      </div>
    </template>

    <template #footer>
      <div class="suggest-form__footer">
        <UButton
          color="neutral"
          variant="outline"
          @click="emit('update:open', false); emit('close')"
        >
          {{ t('suggest.cancel') }}
        </UButton>
        <UButton
          color="primary"
          icon="i-lucide-send"
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ t('suggest.submit') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.suggest-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-1);
}

.suggest-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.suggest-form__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.suggest-form__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: calc(var(--space-5) * -0.75);
}

.suggest-form__section-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.suggest-form__checkboxes {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.suggest-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  width: 100%;
}
</style>