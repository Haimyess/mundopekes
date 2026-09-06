<script setup lang="ts">
import type { Place } from '~/types'
// PlaceSearchResult y PlaceDetails se auto-importan desde layers/domain/composables/usePlacesSearch
// defaultSchedule se auto-importa desde layers/domain/types/schedule (solo se
// usa como placeholder estático — Place ya no edita su propio horario, ver
// UiActivityFields en el lugar donde antes vivía UiPlaceAttributesFields)

const props = defineProps<{
  place?: Place | null
}>()

const emit = defineEmits<{
  saved: [place?: Place]
  close: [place?: Place]
}>()

const { t, locale } = useI18n()
const toast = useToast()
// useEntitySave/hasI18nContent se auto-importan desde app/composables/useEntitySave
const { loading, run } = useEntitySave()
const { geocode, isLoading: geocoding } = useGeocode()
const { uploadFromUrl } = useImageUpload()

const labels = computed(() => ({
  placeName: t('entityForm.placeName'),
  activityTitle: t('entityForm.activityTitle'),
  description: t('entityForm.description'),
  city: t('entityForm.city'),
  cityPlaceholder: t('entityForm.cityPlaceholder'),
  address: t('entityForm.address'),
  addressPlaceholder: t('entityForm.addressPlaceholder'),
  category: t('entityForm.category'),
  phone: t('entityForm.phone'),
  website: t('entityForm.website'),
  ages: t('entityForm.ages'),
  seasons: t('entityForm.seasons'),
  price: t('entityForm.price'),
  free: t('entityForm.free'),
  options: t('entityForm.options'),
  strollerFriendly: t('entityForm.strollerFriendly'),
  openWeekends: t('entityForm.openWeekends'),
  hasShadow: t('entityForm.hasShadow'),
  hasBathrooms: t('entityForm.hasBathrooms'),
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

const placeSearchLabels = computed(() => ({
  label: t('entityForm.placeSearch.label'),
  placeholder: t('entityForm.placeSearch.placeholder'),
  clearLabel: t('entityForm.placeSearch.clear'),
}))

interface PlaceMeta {
  google_place_id?: string | null
  address?: string | null
  phone?: string | null
  website?: string | null
  google_url?: string | null
  wheelchair?: boolean | null
  opening_hours_text?: string[] | null
  photos?: string[] | null
  place_photo_url?: string | null
  // Siempre poblados por el watcher de abajo (defaults a false/null) — no
  // opcionales acá para que calcen con los props requeridos de
  // UiEntityFormFields, aunque el registro en la base sí pueda no tenerlos.
  // Nota: stroller_friendly/open_weekends/has_shadow/schedule_structured/
  // hours_unknown siguen existiendo en filas viejas pero ya no se editan acá
  // (confirmado 2026-08-28: son atributos de Activity, no de Place) — se
  // preservan tal cual estén al guardar (spread de `meta` más abajo), sólo
  // dejan de tener un control de formulario propio.
  is_free: boolean
  price: number | null
  has_bathrooms: boolean
  has_safe_room: boolean
  [key: string]: unknown
}

const emptyMetadata = (): PlaceMeta => ({
  is_free: true,
  price: null,
  has_bathrooms: false,
  has_safe_room: false,
})

const form = reactive({
  name_i18n: {} as Record<string, string>,
  description_i18n: {} as Record<string, string>,
  name_i18n_status: undefined as FieldI18nStatus | undefined,
  description_i18n_status: undefined as FieldI18nStatus | undefined,
  city_id: null as number | null,
  lat: null as number | null,
  lng: null as number | null,
  images: [] as string[],
  metadata: emptyMetadata(),
  status: 'active' as 'active' | 'inactive',
})

const isActive = computed({
  get: () => form.status === 'active',
  set: (val: boolean) => {
    form.status = val ? 'active' : 'inactive'
  },
})

const { data: cities } = await useFetch<Array<{ id: number; name: string }>>('/api/cities')

const googlePhotos = computed(() => form.metadata.photos ?? [])

watch(
  () => props.place,
  (val) => {
    if (val) {
      form.name_i18n = { ...(val.name_i18n ?? {}) }
      form.description_i18n = { ...(val.description_i18n ?? {}) }
      form.name_i18n_status = val.i18n_status?.name
      form.description_i18n_status = val.i18n_status?.description
      form.city_id = val.city_id
      form.lat = val.lat
      form.lng = val.lng
      form.images = [...(val.images ?? [])]
      const meta = (val.metadata as PlaceMeta) ?? {}
      form.metadata = {
        ...meta,
        is_free: meta.is_free ?? true,
        price: meta.price ?? null,
        has_bathrooms: meta.has_bathrooms ?? false,
        has_safe_room: meta.has_safe_room ?? false,
      }
      form.status = val.status ?? 'active'
    } else {
      form.name_i18n = {}
      form.description_i18n = {}
      form.name_i18n_status = undefined
      form.description_i18n_status = undefined
      form.city_id = null
      form.lat = null
      form.lng = null
      form.images = []
      form.metadata = emptyMetadata()
      form.status = 'active'
    }
  },
  { immediate: true }
)

// Autollenado desde Google
const onPlaceSelected = ({
  place,
  details,
}: {
  place: PlaceSearchResult
  details: PlaceDetails | null
}) => {
  form.name_i18n = details ? { ...details.name_i18n } : { ...place.name_i18n }
  if (details?.description_i18n) form.description_i18n = { ...details.description_i18n }
  if (place.lat != null) form.lat = place.lat
  if (place.lng != null) form.lng = place.lng

  // Auto-detect city from address string
  const addressStr = place.address?.toLowerCase() ?? ''
  const matched = cities.value?.find((c) => addressStr.includes(c.name.toLowerCase()))
  if (matched) form.city_id = matched.id

  form.metadata = {
    ...form.metadata,
    google_place_id: place.google_place_id,
    address: place.address ?? form.metadata.address ?? null,
    phone: details?.phone ?? null,
    website: details?.website ?? null,
    google_url: details?.google_url ?? null,
    wheelchair: details?.wheelchair_accessible ?? null,
    has_bathrooms: details?.has_bathrooms ?? form.metadata.has_bathrooms,
    opening_hours_text: details?.opening_hours?.weekday_text ?? null,
    photos: details?.photos ?? [],
    place_photo_url: place.photo_url ?? null,
  }
}

const geocodeCity = async () => {
  const cityName = cities.value?.find((c) => c.id === form.city_id)?.name
  if (!cityName) {
    toast.add({ title: t('placesSlideover.toast.selectCityFirst'), color: 'warning' })
    return
  }
  const result = await geocode(`${cityName}, Israel`)
  if (result) {
    form.lat = result.lat
    form.lng = result.lng
  } else {
    toast.add({ title: t('placesSlideover.toast.noCoordinates'), color: 'warning' })
  }
}

type PlaceDuplicateMatch = { id: string; name: string; confidence: string; reason: string }

const save = async () => {
  if (!hasI18nContent(form.name_i18n)) {
    toast.add({ title: t('placesSlideover.toast.nameRequired'), color: 'error' })
    return
  }

  const editing = !!props.place?.id
  const saved = await run(
    () =>
      editing
        ? $fetch<Place>(`/api/places/${props.place!.id}`, { method: 'PUT', body: form })
        : $fetch<Place & { duplicates?: PlaceDuplicateMatch[] }>('/api/places', {
            method: 'POST',
            body: form,
          }),
    t('placesSlideover.toast.errorTitle')
  )
  if (!saved) return

  toast.add({
    title: t(editing ? 'placesSlideover.toast.updated' : 'placesSlideover.toast.created'),
    color: 'success',
  })

  // Solo el POST devuelve `duplicates` (chequeo no-bloqueante, ver
  // apps/admin/server/api/places/index.post.ts) — sólo avisa, nunca bloquea.
  const firstDuplicate = (saved as { duplicates?: PlaceDuplicateMatch[] }).duplicates?.[0]
  if (firstDuplicate) {
    toast.add({
      title: t('placesSlideover.toast.possibleDuplicate', { name: firstDuplicate.name }),
      color: 'warning',
      icon: 'i-lucide-alert-triangle',
    })
  }

  emit('saved', saved)
  emit('close', saved)
}
</script>

<template>
  <UiEntitySlideover
    :title="place ? t('placesSlideover.editTitle') : t('placesSlideover.createTitle')"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col gap-4 p-4">
        <UFormField
          :label="t('placesSlideover.form.active')"
          :description="t('placesSlideover.form.activeDescription')"
          class="flex items-center justify-between gap-2"
        >
          <USwitch v-model="isActive" />
        </UFormField>

        <!-- Búsqueda en Google (autollena los campos) -->
        <UiPlaceSearch
          lang="en"
          :label="placeSearchLabels.label"
          :placeholder="placeSearchLabels.placeholder"
          :clear-label="placeSearchLabels.clearLabel"
          @selected="onPlaceSelected"
        />

        <UiEntityFormFields
          v-model:name-i18n="form.name_i18n"
          v-model:description-i18n="form.description_i18n"
          v-model:name-i18n-status="form.name_i18n_status"
          v-model:description-i18n-status="form.description_i18n_status"
          v-model:city-id="form.city_id"
          v-model:address="form.metadata.address"
          v-model:phone="form.metadata.phone"
          v-model:website="form.metadata.website"
          v-model:is-free="form.metadata.is_free"
          v-model:price="form.metadata.price"
          v-model:has-bathrooms="form.metadata.has_bathrooms"
          v-model:has-safe-room="form.metadata.has_safe_room"
          v-model:images="form.images"
          type="place"
          :locale="locale"
          :age-range-ids="[]"
          :best-season="[]"
          :stroller-friendly="false"
          :open-weekends="false"
          :has-shadow="false"
          :schedule-structured="defaultSchedule()"
          :hours-unknown="false"
          :city-options="cities ?? []"
          :google-hours-text="(form.metadata.opening_hours_text ?? []).join('\n')"
          :google-photos="googlePhotos"
          :upload-fn="uploadFromUrl"
          :age-range-options="[]"
          :season-options="[]"
          :labels="labels"
        />

        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="t('placesSlideover.form.latitude')">
            <UInput v-model="form.lat" type="number" placeholder="32.0853" class="w-full" />
          </UFormField>
          <UFormField :label="t('placesSlideover.form.longitude')">
            <UInput v-model="form.lng" type="number" placeholder="34.7818" class="w-full" />
          </UFormField>
        </div>
        <UButton
          color="neutral"
          variant="outline"
          size="xs"
          icon="i-lucide-map-pin"
          :loading="geocoding"
          class="self-start"
          @click="geocodeCity"
        >
          {{ t('placesSlideover.getCoordinatesButton') }}
        </UButton>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton color="neutral" variant="outline" @click="emit('close')">
          {{ t('placesSlideover.cancel') }}
        </UButton>
        <UButton :loading="loading" @click="save">
          {{ place ? t('placesSlideover.saveChanges') : t('placesSlideover.createButton') }}
        </UButton>
      </div>
    </template>
  </UiEntitySlideover>
</template>
