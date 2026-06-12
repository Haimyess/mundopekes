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

const toast = useToast()
const overlay = useOverlay()
const loading = ref(false)

const AGE_LABELS: Record<string, string> = {
  'age.all': 'All ages',
  'age.babies': 'Babies (0–11m)',
  'age.toddlers': 'Toddlers (1–3)',
  'age.preschool': 'Preschool (3–6)',
  'age.school': 'School age (6–12)',
  'age.teens': 'Teens (12+)',
}
const SEASON_LABELS: Record<string, string> = {
  all: 'All seasons',
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
}

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

watch(
  () => form.is_free,
  (val) => {
    if (val) form.price = null
  }
)

watch(
  () => form.price,
  (val) => {
    if (val && val > 0) form.is_free = false
  }
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
    toast.add({ title: 'El título es requerido en al menos un idioma', color: 'error' })
    return
  }
  if (!form.place_id) {
    toast.add({ title: 'Seleccioná un lugar', color: 'error' })
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
      toast.add({ title: 'Actividad actualizada', color: 'success' })
    } else {
      await $fetch('/api/activities', { method: 'POST', body })
      toast.add({ title: 'Actividad creada', color: 'success' })
    }
    emit('saved')
    emit('close')
  } catch (e) {
    toast.add({
      title: 'Error',
      description: e instanceof Error ? e.message : String(e),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <USlideover
    :title="activity ? 'Editar actividad' : 'Nueva actividad'"
    :close="{ onClick: () => emit('close') }"
  >
    <template #body>
      <div class="flex flex-col gap-4 p-4">
        <!-- Selector de lugar (solo cuando NO viene placeId fijo) -->
        <UFormField v-if="!placeId" label="Place" required>
          <div class="flex gap-2">
            <USelect
              v-model="form.place_id"
              :items="placeOptions"
              placeholder="Select a place"
              searchable
              class="flex-1"
            />
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-plus"
              title="Crear lugar nuevo"
              @click="openCreatePlace"
            >
              Nuevo
            </UButton>
          </div>
        </UFormField>

        <UiI18nTabs v-model="form.title_i18n" label="Title" required />

        <UiI18nTabs v-model="form.description_i18n" label="Description" type="textarea" :rows="3" />

        <UFormField label="Category">
          <USelect
            v-model="form.category_id"
            :items="categoryOptions"
            placeholder="Select a category"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Age ranges">
          <UiAgeRangeSelector
            v-model="form.age_range_ids"
            :options="reference?.ageRanges ?? []"
            :labels="AGE_LABELS"
            :all-id="allAgeId"
          />
        </UFormField>

        <UFormField label="Seasons">
          <UiSeasonSelector
            v-model="form.best_season"
            :options="reference?.seasons ?? []"
            :labels="SEASON_LABELS"
          />
        </UFormField>

        <UFormField label="Status">
          <USelect
            v-model="form.status"
            :items="[
              { label: 'Approved', value: 'approved' },
              { label: 'Pending', value: 'pending' },
              { label: 'Rejected', value: 'rejected' },
            ]"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Price">
          <div class="flex flex-col gap-2 w-full">
            <UCheckbox v-model="form.is_free" label="Free" />
            <UInput
              v-if="!form.is_free"
              v-model="form.price"
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

        <!-- Horarios estructurados (autollenados desde Google, editables) -->
        <UiScheduleEditor
          v-model:schedule="form.schedule_structured"
          v-model:hours-unknown="form.hours_unknown"
          :google-hours-text="googleHoursText"
        />

        <UFormField label="Options">
          <div class="flex flex-col gap-2">
            <UCheckbox v-model="form.stroller_friendly" label="Stroller / wheelchair friendly" />
            <UCheckbox v-model="form.open_weekends" label="Open on weekends" />
            <UCheckbox v-model="form.has_shadow" label="Has shade" />
            <UCheckbox v-model="form.has_bathrooms" label="Has bathrooms" />
          </div>
        </UFormField>

        <UiImageUploader v-model="form.images" :google-photos="googlePhotos" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton color="neutral" variant="outline" @click="emit('close')"> Cancelar </UButton>
        <UButton :loading="loading" @click="save">
          {{ activity ? 'Guardar cambios' : 'Crear actividad' }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
