<script setup lang="ts">
// Bloque de campos compartido entre ActivitiesSlideover y el modo edición de
// SuggestionsSlideover: edades, temporadas, gratis/precio, horario, checkboxes
// de opciones e imágenes. Sin i18n propio — todas las etiquetas llegan por prop,
// igual que el resto de los componentes Ui* de este directorio.
import type { WizardSchedule } from '../../../domain/types/schedule'

interface AgeOption {
  id: number
  label_key: string
}
interface SeasonOption {
  value: string
  label_key: string
}

const props = defineProps<{
  ageRangeIds: number[]
  bestSeason: string[]
  scheduleStructured: WizardSchedule
  hoursUnknown: boolean
  isFree: boolean
  price: number | null
  strollerFriendly: boolean
  openWeekends: boolean
  hasShadow: boolean
  hasBathrooms: boolean
  website?: string | null
  images: string[]

  ageRangeOptions: AgeOption[]
  seasonOptions: SeasonOption[]
  ageLabels?: Record<string, string>
  seasonLabels?: Record<string, string>
  allAgeId?: number
  googleHoursText?: string
  googlePhotos?: string[]
  uploadFn?: (url: string) => Promise<string>

  agesLabel: string
  seasonsLabel: string
  priceLabel: string
  freeLabel: string
  optionsLabel: string
  strollerFriendlyLabel: string
  openWeekendsLabel: string
  hasShadowLabel: string
  hasBathroomsLabel: string
  websiteLabel?: string
}>()

const emit = defineEmits<{
  'update:ageRangeIds': [value: number[]]
  'update:bestSeason': [value: string[]]
  'update:scheduleStructured': [value: WizardSchedule]
  'update:hoursUnknown': [value: boolean]
  'update:isFree': [value: boolean]
  'update:price': [value: number | null]
  'update:strollerFriendly': [value: boolean]
  'update:openWeekends': [value: boolean]
  'update:hasShadow': [value: boolean]
  'update:hasBathrooms': [value: boolean]
  'update:website': [value: string]
  'update:images': [value: string[]]
}>()

const ageRangeIdsProxy = computed({
  get: () => props.ageRangeIds,
  set: (v: number[]) => emit('update:ageRangeIds', v),
})
const bestSeasonProxy = computed({
  get: () => props.bestSeason,
  set: (v: string[]) => emit('update:bestSeason', v),
})
const scheduleStructuredProxy = computed({
  get: () => props.scheduleStructured,
  set: (v: WizardSchedule) => emit('update:scheduleStructured', v),
})
const hoursUnknownProxy = computed({
  get: () => props.hoursUnknown,
  set: (v: boolean) => emit('update:hoursUnknown', v),
})
// Gratis/precio son mutuamente excluyentes — misma regla que antes vivía
// suelta en cada Slideover, ahora centralizada acá.
const isFreeProxy = computed({
  get: () => props.isFree,
  set: (v: boolean) => {
    emit('update:isFree', v)
    if (v) emit('update:price', null)
  },
})
const priceProxy = computed({
  get: () => props.price,
  set: (v: number | null) => {
    emit('update:price', v)
    if (v && v > 0) emit('update:isFree', false)
  },
})
const strollerFriendlyProxy = computed({
  get: () => props.strollerFriendly,
  set: (v: boolean) => emit('update:strollerFriendly', v),
})
const openWeekendsProxy = computed({
  get: () => props.openWeekends,
  set: (v: boolean) => emit('update:openWeekends', v),
})
const hasShadowProxy = computed({
  get: () => props.hasShadow,
  set: (v: boolean) => emit('update:hasShadow', v),
})
const hasBathroomsProxy = computed({
  get: () => props.hasBathrooms,
  set: (v: boolean) => emit('update:hasBathrooms', v),
})
const imagesProxy = computed({
  get: () => props.images,
  set: (v: string[]) => emit('update:images', v),
})
const websiteProxy = computed({
  get: () => props.website ?? '',
  set: (v: string) => emit('update:website', v),
})
</script>

<template>
  <UFormField :label="agesLabel">
    <UiAgeRangeSelector
      v-model="ageRangeIdsProxy"
      :options="ageRangeOptions"
      :labels="ageLabels"
      :all-id="allAgeId"
    />
  </UFormField>

  <UFormField :label="seasonsLabel">
    <UiSeasonSelector v-model="bestSeasonProxy" :options="seasonOptions" :labels="seasonLabels" />
  </UFormField>

  <UFormField :label="priceLabel">
    <div class="flex flex-col gap-2 w-full">
      <UCheckbox v-model="isFreeProxy" :label="freeLabel" />
      <UInput
        v-if="!isFreeProxy"
        v-model="priceProxy"
        type="number"
        placeholder="150"
        class="w-full"
      >
        <template #leading>
          <span class="text-muted text-sm">₪</span>
        </template>
      </UInput>
    </div>
  </UFormField>

  <UiScheduleEditor
    v-model:schedule="scheduleStructuredProxy"
    v-model:hours-unknown="hoursUnknownProxy"
    :google-hours-text="googleHoursText ?? ''"
  />

  <UFormField v-if="websiteLabel" :label="websiteLabel">
    <UInput v-model="websiteProxy" placeholder="https://..." class="w-full" />
  </UFormField>

  <UFormField :label="optionsLabel">
    <div class="flex flex-col gap-2">
      <UCheckbox v-model="strollerFriendlyProxy" :label="strollerFriendlyLabel" />
      <UCheckbox v-model="openWeekendsProxy" :label="openWeekendsLabel" />
      <UCheckbox v-model="hasShadowProxy" :label="hasShadowLabel" />
      <UCheckbox v-model="hasBathroomsProxy" :label="hasBathroomsLabel" />
    </div>
  </UFormField>

  <UiImageUploader
    v-model="imagesProxy"
    :google-photos="googlePhotos ?? []"
    :upload-fn="uploadFn"
  />
</template>
