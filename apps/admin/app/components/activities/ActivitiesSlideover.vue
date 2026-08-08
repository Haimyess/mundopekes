<script setup lang="ts">
import type { Activity, Category, Place } from '~/types'
// WizardSchedule y defaultSchedule se auto-importan desde layers/domain/types/schedule
import PlacesSlideover from '~/components/places/PlacesSlideover.vue'

const props = defineProps<{
  activity?: Activity | null
  placeId?: string
  place?: Place | null
}>()

const emit = defineEmits<{
  saved: []
  close: []
}>()

const { t } = useI18n()
const toast = useToast()
const overlay = useOverlay()
const loading = ref(false)
const { uploadFromUrl } = useImageUpload()

const AGE_LABELS = computed<Record<string, string>>(() => ({
  'age.all': t('activitiesSlideover.ageLabels.all'),
  'age.babies': t('activitiesSlideover.ageLabels.babies'),
  'age.toddlers': t('activitiesSlideover.ageLabels.toddlers'),
  'age.preschool': t('activitiesSlideover.ageLabels.preschool'),
  'age.school': t('activitiesSlideover.ageLabels.school'),
  'age.teens': t('activitiesSlideover.ageLabels.teens'),
}))
const SEASON_LABELS = computed<Record<string, string>>(() => ({
  all: t('activitiesSlideover.seasonLabels.all'),
  spring: t('activitiesSlideover.seasonLabels.spring'),
  summer: t('activitiesSlideover.seasonLabels.summer'),
  autumn: t('activitiesSlideover.seasonLabels.autumn'),
  winter: t('activitiesSlideover.seasonLabels.winter'),
}))

interface ActivityMeta {
  schedule_structured?: WizardSchedule | null
  hours_unknown?: boolean | null
  has_shadow?: boolean | null
  has_bathrooms?: boolean | null
  photos?: string[] | null
  [key: string]: unknown
}

const form = reactive({
  place_id: props.placeId ?? '',
  category_id: undefined as string | undefined,
  title_i18n: {} as Record<string, string>,
  description_i18n: {} as Record<string, string>,
  price: null as number | null,
  is_free: true,
  stroller_friendly: false,
  open_weekends: false,
  status: 'approved' as 'pending' | 'approved' | 'rejected',
  schedule: '',
  images: [] as string[],
  // Parity fields
  age_range_ids: [] as number[],
  best_season: [] as string[],
  schedule_structured: defaultSchedule() as WizardSchedule,
  hours_unknown: false,
  has_shadow: false,
  has_bathrooms: false,
})

const { data: categories } = await useFetch<Category[]>('/api/categories')
const { data: reference } = await useFetch<{
  subcategories: { id: string; name_i18n: Record<string, string>; slug: string }[]
  seasons: { value: string; label_key: string }[]
  ageRanges: { id: number; label_key: string }[]
}>('/api/reference')
const { data: places } = props.placeId
  ? { data: ref<Place[] | null>(null) }
  : await useFetch<Place[]>('/api/places')

const allAgeId = computed(
  () => reference.value?.ageRanges.find((a) => a.label_key === 'age.all')?.id
)

const placeOptions = computed(() =>
  (places.value ?? []).map((p) => {
    const name = p.name_i18n['en'] || p.name_i18n['he'] || p.name_i18n['es'] || ''
    return { label: p.city?.name ? `${name} — ${p.city.name}` : name, value: p.id }
  })
)

const categoryOptions = computed(() =>
  (categories.value ?? []).map((c) => ({
    label: c.name_i18n['en'] || c.name_i18n['he'] || c.name_i18n['es'] || '',
    value: c.id,
  }))
)

const selectedPlace = computed(
  () => props.place ?? (places.value ?? []).find((p) => p.id === form.place_id) ?? null
)

// Toggle rápido activo/inactivo — atajo sobre form.status (approved <-> pending).
// El select de abajo sigue permitiendo elegir 'rejected' explícitamente.
const isActive = computed({
  get: () => form.status === 'approved',
  set: (val: boolean) => {
    form.status = val ? 'approved' : 'pending'
  },
})

// Horarios de Google del lugar seleccionado (para sembrar el editor)
const googleHoursText = computed(() => {
  const hours = (selectedPlace.value?.metadata as { opening_hours_text?: string[] } | undefined)
    ?.opening_hours_text
  return Array.isArray(hours) ? hours.join('\n') : ''
})

// Fotos de Google del lugar para el ImageUploader
const googlePhotos = computed(() => {
  const meta = selectedPlace.value?.metadata as { photos?: string[] } | null
  return meta?.photos ?? []
})

// Auto-fill al seleccionar un lugar (solo en modo creación)
watch(
  () => form.place_id,
  (id) => {
    if (props.activity || !id) return
    const place = (places.value ?? []).find((p) => p.id === id)
    if (!place) return
    const meta = place.metadata as Record<string, unknown> | null
    if (meta?.wheelchair_accessible === true) form.stroller_friendly = true
    if (meta?.has_bathrooms === true) form.has_bathrooms = true
    const desc = meta?.description_i18n as Record<string, string> | undefined
    if (desc && !Object.values(form.description_i18n).some((v) => v?.trim()))
      form.description_i18n = { ...desc }
  }
)

watch(
  () => props.activity,
  (val) => {
    if (val) {
      const v = val as Activity & {
        metadata?: ActivityMeta
        activity_age_ranges?: { age_range: { id: number } }[]
        activity_seasons?: { season: { value: string } }[]
      }
      const meta = v.metadata ?? {}
      form.place_id = val.place_id
      form.category_id = val.category_id ?? undefined
      form.title_i18n = (val.title_i18n as Record<string, string>) ?? {}
      form.description_i18n = (val.description_i18n as Record<string, string>) ?? {}
      form.price = val.price
      form.is_free = val.is_free
      form.stroller_friendly = val.stroller_friendly
      form.open_weekends = val.open_weekends
      form.status = val.status
      form.schedule = val.schedule ?? ''
      form.images = [...(val.images ?? [])]
      form.age_range_ids = (v.activity_age_ranges ?? []).map((r) => r.age_range.id)
      form.best_season = (v.activity_seasons ?? []).map((r) => r.season.value)
      form.schedule_structured = meta.schedule_structured ?? defaultSchedule()
      form.hours_unknown = meta.hours_unknown === true
      form.has_shadow = meta.has_shadow === true
      form.has_bathrooms = meta.has_bathrooms === true
    } else {
      form.place_id = props.placeId ?? ''
      form.category_id = undefined
      form.title_i18n = {}
      form.description_i18n = {}
      form.price = null
      form.is_free = true
      form.stroller_friendly = false
      form.open_weekends = false
      form.status = 'approved'
      form.schedule = ''
      form.images = []
      form.age_range_ids = []
      form.best_season = []
      form.schedule_structured = defaultSchedule()
      form.hours_unknown = false
      form.has_shadow = false
      form.has_bathrooms = false
    }
  },
  { immediate: true }
)

// Crear lugar nuevo inline → autoseleccionar al volver
const openCreatePlace = async () => {
  const slideover = overlay.create(PlacesSlideover, { props: { place: null } })
  const created = (await slideover.open()) as Place | undefined
  if (created?.id) {
    if (places.value) places.value = [created, ...places.value]
    form.place_id = created.id
  }
}

const save = async () => {
  if (!Object.values(form.title_i18n).some((v) => v?.trim())) {
    toast.add({ title: t('activitiesSlideover.toast.titleRequired'), color: 'error' })
    return
  }
  if (!form.place_id) {
    toast.add({ title: t('activitiesSlideover.toast.placeRequired'), color: 'error' })
    return
  }
  loading.value = true

  const body = {
    place_id: form.place_id,
    category_id: form.category_id ?? null,
    title_i18n: form.title_i18n,
    description_i18n: form.description_i18n,
    price: form.price,
    is_free: form.is_free,
    stroller_friendly: form.stroller_friendly,
    open_weekends: form.open_weekends,
    status: form.status,
    schedule: form.schedule,
    images: form.images,
    // Pivots — el server los escribe en activity_age_ranges / activity_seasons y los quita del row
    age_range_ids: form.age_range_ids,
    best_season: form.best_season,
    metadata: {
      schedule_structured: form.hours_unknown ? null : form.schedule_structured,
      hours_unknown: form.hours_unknown,
      has_shadow: form.has_shadow,
      has_bathrooms: form.has_bathrooms,
      age_range_ids: form.age_range_ids,
    },
  }

  try {
    if (props.activity?.id) {
      await $fetch(`/api/activities/${props.activity.id}`, { method: 'PUT', body })
      toast.add({ title: t('activitiesSlideover.toast.updated'), color: 'success' })
    } else {
      await $fetch('/api/activities', { method: 'POST', body })
      toast.add({ title: t('activitiesSlideover.toast.created'), color: 'success' })
    }
    emit('saved')
    emit('close')
  } catch (e) {
    toast.add({
      title: t('activitiesSlideover.toast.errorTitle'),
      description: e instanceof Error ? e.message : String(e),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UiEntitySlideover
    :title="activity ? t('activitiesSlideover.editTitle') : t('activitiesSlideover.createTitle')"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4 p-4">
        <!-- Selector de lugar (solo cuando NO viene placeId fijo) -->
        <UFormField v-if="!placeId" :label="t('activitiesSlideover.form.place')" required>
          <div class="flex gap-2">
            <USelect
              v-model="form.place_id"
              :items="placeOptions"
              :placeholder="t('activitiesSlideover.form.placePlaceholder')"
              searchable
              class="flex-1"
            />
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-plus"
              :title="t('activitiesSlideover.createPlaceTitle')"
              @click="openCreatePlace"
            >
              {{ t('activitiesSlideover.newButton') }}
            </UButton>
          </div>
        </UFormField>

        <UiI18nTabs
          v-model="form.title_i18n"
          :label="t('activitiesSlideover.form.title')"
          required
        />

        <UiI18nTabs
          v-model="form.description_i18n"
          :label="t('activitiesSlideover.form.description')"
          type="textarea"
          :rows="3"
        />

        <UFormField :label="t('activitiesSlideover.form.category')">
          <USelect
            v-model="form.category_id"
            :items="categoryOptions"
            :placeholder="t('activitiesSlideover.form.categoryPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('activitiesSlideover.form.active')"
          :description="t('activitiesSlideover.form.activeDescription')"
          class="flex items-center justify-between gap-2"
        >
          <USwitch v-model="isActive" />
        </UFormField>

        <UFormField :label="t('activitiesSlideover.form.status')">
          <USelect
            v-model="form.status"
            :items="[
              { label: t('activitiesSlideover.status.approved'), value: 'approved' },
              { label: t('activitiesSlideover.status.pending'), value: 'pending' },
              { label: t('activitiesSlideover.status.rejected'), value: 'rejected' },
            ]"
            class="w-full"
          />
        </UFormField>

        <UiActivityFields
          v-model:age-range-ids="form.age_range_ids"
          v-model:best-season="form.best_season"
          v-model:schedule-structured="form.schedule_structured"
          v-model:hours-unknown="form.hours_unknown"
          v-model:is-free="form.is_free"
          v-model:price="form.price"
          v-model:stroller-friendly="form.stroller_friendly"
          v-model:open-weekends="form.open_weekends"
          v-model:has-shadow="form.has_shadow"
          v-model:has-bathrooms="form.has_bathrooms"
          v-model:images="form.images"
          :age-range-options="reference?.ageRanges ?? []"
          :season-options="reference?.seasons ?? []"
          :age-labels="AGE_LABELS"
          :season-labels="SEASON_LABELS"
          :all-age-id="allAgeId"
          :google-hours-text="googleHoursText"
          :google-photos="googlePhotos"
          :upload-fn="uploadFromUrl"
          :ages-label="t('activitiesSlideover.form.ageRanges')"
          :seasons-label="t('activitiesSlideover.form.seasons')"
          :price-label="t('activitiesSlideover.form.price')"
          :free-label="t('activitiesSlideover.form.free')"
          :options-label="t('activitiesSlideover.form.options')"
          :stroller-friendly-label="t('activitiesSlideover.form.strollerFriendly')"
          :open-weekends-label="t('activitiesSlideover.form.openWeekends')"
          :has-shadow-label="t('activitiesSlideover.form.hasShade')"
          :has-bathrooms-label="t('activitiesSlideover.form.hasBathrooms')"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton color="neutral" variant="outline" @click="emit('close')">
          {{ t('activitiesSlideover.cancel') }}
        </UButton>
        <UButton :loading="loading" @click="save">
          {{
            activity ? t('activitiesSlideover.saveChanges') : t('activitiesSlideover.createButton')
          }}
        </UButton>
      </div>
    </template>
  </UiEntitySlideover>
</template>
