<script setup lang="ts">
import type { Activity, Place } from '~/types'
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

const { t, locale } = useI18n()
const toast = useToast()
const overlay = useOverlay()
// useEntitySave/hasI18nContent se auto-importan desde app/composables/useEntitySave
const { loading, run } = useEntitySave()
const { uploadFromUrl } = useImageUpload()

const AGE_LABELS = computed<Record<string, string>>(() => ({
  'age.all': t('entityForm.ageLabels.all'),
  'age.babies': t('entityForm.ageLabels.babies'),
  'age.toddlers': t('entityForm.ageLabels.toddlers'),
  'age.preschool': t('entityForm.ageLabels.preschool'),
  'age.school': t('entityForm.ageLabels.school'),
  'age.teens': t('entityForm.ageLabels.teens'),
}))
const SEASON_LABELS = computed<Record<string, string>>(() => ({
  all: t('entityForm.seasonLabels.all'),
  spring: t('entityForm.seasonLabels.spring'),
  summer: t('entityForm.seasonLabels.summer'),
  autumn: t('entityForm.seasonLabels.autumn'),
  winter: t('entityForm.seasonLabels.winter'),
}))
const FORM_LABELS = computed(() => ({
  placeName: t('entityForm.placeName'),
  activityTitle: t('activitiesSlideover.form.title'),
  description: t('activitiesSlideover.form.description'),
  city: t('entityForm.city'),
  cityPlaceholder: t('entityForm.cityPlaceholder'),
  address: t('entityForm.address'),
  addressPlaceholder: t('entityForm.addressPlaceholder'),
  category: t('activitiesSlideover.form.category'),
  categoryPlaceholder: t('activitiesSlideover.form.categoryPlaceholder'),
  phone: t('entityForm.phone'),
  website: t('entityForm.website'),
  ages: t('activitiesSlideover.form.ageRanges'),
  seasons: t('activitiesSlideover.form.seasons'),
  price: t('activitiesSlideover.form.price'),
  free: t('activitiesSlideover.form.free'),
  options: t('activitiesSlideover.form.options'),
  strollerFriendly: t('activitiesSlideover.form.strollerFriendly'),
  openWeekends: t('activitiesSlideover.form.openWeekends'),
  hasShadow: t('activitiesSlideover.form.hasShade'),
  hasBathrooms: t('activitiesSlideover.form.hasBathrooms'),
  placeAttributes: t('entityForm.placeAttributes'),
  hasSafeRoom: t('entityForm.hasSafeRoom'),
  activityWebsite: t('entityForm.activityWebsite'),
  schedule: t('entityForm.schedule'),
  images: t('entityForm.images'),
  loading: t('entityForm.loading'),
  i18nField: {
    hint: t('entityForm.i18nField.hint'),
    showMore: t('entityForm.i18nField.showMore'),
    hideEmpty: t('entityForm.i18nField.hideEmpty'),
    autoTranslated: t('entityForm.i18nField.autoTranslated'),
    translationFailed: t('entityForm.i18nField.translationFailed'),
    manualLocked: t('entityForm.i18nField.manualLocked'),
  },
  scheduleEditor: {
    sectionLabel: t('entityForm.scheduleEditor.sectionLabel'),
    hoursUnknown: t('entityForm.scheduleEditor.hoursUnknown'),
    editManually: t('entityForm.scheduleEditor.editManually'),
    backToGoogle: t('entityForm.scheduleEditor.backToGoogle'),
    days: {
      sunday: t('entityForm.scheduleEditor.days.sunday'),
      monday: t('entityForm.scheduleEditor.days.monday'),
      tuesday: t('entityForm.scheduleEditor.days.tuesday'),
      wednesday: t('entityForm.scheduleEditor.days.wednesday'),
      thursday: t('entityForm.scheduleEditor.days.thursday'),
      friday: t('entityForm.scheduleEditor.days.friday'),
      saturday: t('entityForm.scheduleEditor.days.saturday'),
    },
  },
  imageUploader: {
    addButton: t('entityForm.imageUploader.addButton'),
    addPlaceholder: t('entityForm.imageUploader.addPlaceholder'),
    selectAria: t('entityForm.imageUploader.selectAria'),
    removeAria: t('entityForm.imageUploader.removeAria'),
    coverTitle: t('entityForm.imageUploader.coverTitle'),
    setCoverTitle: t('entityForm.imageUploader.setCoverTitle'),
  },
}))

type ActivityDuplicateMatch = { id: string; title: string; confidence: string; reason: string }

interface ActivityMeta {
  schedule_structured?: WizardSchedule | null
  hours_unknown?: boolean | null
  has_shadow?: boolean | null
  has_bathrooms?: boolean | null
  website?: string | null
  photos?: string[] | null
  [key: string]: unknown
}

const form = reactive({
  place_id: props.placeId ?? '',
  category_id: null as string | null,
  title_i18n: {} as Record<string, string>,
  description_i18n: {} as Record<string, string>,
  title_i18n_status: undefined as FieldI18nStatus | undefined,
  description_i18n_status: undefined as FieldI18nStatus | undefined,
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
  // website vive en metadata.website (no es columna real de activities) —
  // mismo patrón que has_shadow/has_bathrooms de más arriba.
  website: '',
})

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

const selectedPlace = computed(
  () => props.place ?? (places.value ?? []).find((p) => p.id === form.place_id) ?? null
)

// Una actividad ya vinculada a un lugar (editando una existente, o creada
// desde la página del lugar vía placeId) no debería poder cambiar de lugar
// acá — se muestra como bloque informativo en vez de select editable.
const isPlaceLocked = computed(() => !!props.placeId || !!props.activity?.place_id)
const linkedPlaceLabel = computed(() => {
  const p = selectedPlace.value
  if (!p) return ''
  const name = p.name_i18n['en'] || p.name_i18n['he'] || p.name_i18n['es'] || ''
  return p.city?.name ? `${name} — ${p.city.name}` : name
})

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

// Auto-fill al seleccionar un lugar (solo en modo creación) — son defaults
// editables, no un lock: el admin puede pisarlos si la actividad es distinta
// del lugar (ej. el parque tiene sombra pero el jardín botánico adentro no
// es apto para carritos).
watch(
  () => form.place_id,
  (id) => {
    if (props.activity || !id) return
    const place = (places.value ?? []).find((p) => p.id === id)
    if (!place) return
    const meta = place.metadata as Record<string, unknown> | null
    if (meta?.wheelchair_accessible === true) form.stroller_friendly = true
    if (meta?.stroller_friendly === true) form.stroller_friendly = true
    if (meta?.has_bathrooms === true) form.has_bathrooms = true
    if (meta?.has_shadow === true) form.has_shadow = true
    if (meta?.open_weekends === true) form.open_weekends = true
    if (meta?.hours_unknown === true) {
      form.hours_unknown = true
    } else if (meta?.schedule_structured) {
      form.schedule_structured = mergeSchedule(meta.schedule_structured as Partial<WizardSchedule>)
    }
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
      form.category_id = val.category_id ?? null
      form.title_i18n = (val.title_i18n as Record<string, string>) ?? {}
      form.description_i18n = (val.description_i18n as Record<string, string>) ?? {}
      form.title_i18n_status = v.i18n_status?.title
      form.description_i18n_status = v.i18n_status?.description
      form.price = val.price
      form.is_free = val.is_free
      form.stroller_friendly = val.stroller_friendly
      form.open_weekends = val.open_weekends
      form.status = val.status
      form.schedule = val.schedule ?? ''
      form.images = [...(val.images ?? [])]
      form.age_range_ids = (v.activity_age_ranges ?? []).map((r) => r.age_range.id)
      form.best_season = (v.activity_seasons ?? []).map((r) => r.season.value)
      form.schedule_structured = mergeSchedule(meta.schedule_structured)
      form.hours_unknown = meta.hours_unknown === true
      form.has_shadow = meta.has_shadow === true
      form.has_bathrooms = meta.has_bathrooms === true
      form.website = meta.website ?? ''
    } else {
      form.place_id = props.placeId ?? ''
      form.category_id = null
      form.title_i18n = {}
      form.description_i18n = {}
      form.title_i18n_status = undefined
      form.description_i18n_status = undefined
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
      form.website = ''
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
  if (!hasI18nContent(form.title_i18n)) {
    toast.add({ title: t('activitiesSlideover.toast.titleRequired'), color: 'error' })
    return
  }
  if (!form.place_id) {
    toast.add({ title: t('activitiesSlideover.toast.placeRequired'), color: 'error' })
    return
  }

  const body = {
    place_id: form.place_id,
    category_id: form.category_id ?? null,
    title_i18n: form.title_i18n,
    description_i18n: form.description_i18n,
    title_i18n_status: form.title_i18n_status,
    description_i18n_status: form.description_i18n_status,
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
      website: form.website || null,
      age_range_ids: form.age_range_ids,
    },
  }

  const isEdit = !!props.activity?.id
  const result = await run(
    () =>
      isEdit
        ? $fetch(`/api/activities/${props.activity!.id}`, { method: 'PUT', body })
        : $fetch<{ duplicates?: ActivityDuplicateMatch[] }>('/api/activities', {
            method: 'POST',
            body,
          }),
    t('activitiesSlideover.toast.errorTitle')
  )
  if (result === undefined) return

  toast.add({
    title: t(isEdit ? 'activitiesSlideover.toast.updated' : 'activitiesSlideover.toast.created'),
    color: 'success',
  })

  // Solo el POST devuelve `duplicates` (chequeo no-bloqueante, ver
  // apps/admin/server/api/activities/index.post.ts) — sólo avisa, nunca bloquea.
  const firstDuplicate = (result as { duplicates?: ActivityDuplicateMatch[] }).duplicates?.[0]
  if (firstDuplicate) {
    toast.add({
      title: t('activitiesSlideover.toast.possibleDuplicate', { title: firstDuplicate.title }),
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
  }

  emit('saved')
  emit('close')
}
</script>

<template>
  <UiEntitySlideover
    :title="activity ? t('activitiesSlideover.editTitle') : t('activitiesSlideover.createTitle')"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4 p-4">
        <!-- Lugar ya vinculado (editando, o creada desde la página del lugar): -->
        <!-- sólo informativo, no se puede cambiar acá. -->
        <UFormField v-if="isPlaceLocked" :label="t('activitiesSlideover.form.place')">
          <div
            class="flex items-center gap-2 px-3 py-2 rounded-md border border-(--ui-border) text-sm"
          >
            <UIcon name="i-lucide-map-pin" class="text-primary size-4 shrink-0" />
            <span class="truncate">{{ linkedPlaceLabel }}</span>
            <span class="text-xs text-(--ui-text-muted) ml-auto shrink-0">
              {{ t('activitiesSlideover.form.placeLinkedHint') }}
            </span>
          </div>
        </UFormField>

        <!-- Selector de lugar (sólo al crear una actividad sin lugar fijo) -->
        <UFormField v-else :label="t('activitiesSlideover.form.place')" required>
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

        <UiEntityFormFields
          v-model:title-i18n="form.title_i18n"
          v-model:description-i18n="form.description_i18n"
          v-model:title-i18n-status="form.title_i18n_status"
          v-model:description-i18n-status="form.description_i18n_status"
          v-model:category-id="form.category_id"
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
          v-model:activity-website="form.website"
          v-model:images="form.images"
          type="activity"
          :subcategory-options="reference?.subcategories ?? []"
          :age-range-options="reference?.ageRanges ?? []"
          :season-options="reference?.seasons ?? []"
          :age-labels="AGE_LABELS"
          :season-labels="SEASON_LABELS"
          :all-age-id="allAgeId"
          :google-hours-text="googleHoursText"
          :google-photos="googlePhotos"
          :upload-fn="uploadFromUrl"
          :labels="FORM_LABELS"
          :locale="locale"
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
