<script setup lang="ts">
import type { Place } from '~/types'
// PlaceSearchResult y PlaceDetails se auto-importan desde layers/domain/composables/usePlacesSearch

const props = defineProps<{
  place?: Place | null
}>()

const emit = defineEmits<{
  saved: [place?: Place]
  close: [place?: Place]
}>()

const { t } = useI18n()
const toast = useToast()
const loading = ref(false)
const { geocode, isLoading: geocoding } = useGeocode()
const { uploadFromUrl } = useImageUpload()

interface PlaceMeta {
  google_place_id?: string | null
  phone?: string | null
  website?: string | null
  google_url?: string | null
  wheelchair?: boolean | null
  opening_hours_text?: string[] | null
  photos?: string[] | null
  place_photo_url?: string | null
  [key: string]: unknown
}

const form = reactive({
  name_i18n: {} as Record<string, string>,
  description_i18n: {} as Record<string, string>,
  city_id: null as number | null,
  lat: null as number | null,
  lng: null as number | null,
  images: [] as string[],
  metadata: {} as PlaceMeta,
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
      form.city_id = val.city_id
      form.lat = val.lat
      form.lng = val.lng
      form.images = [...(val.images ?? [])]
      form.metadata = { ...((val.metadata as PlaceMeta) ?? {}) }
      form.status = val.status ?? 'active'
    } else {
      form.name_i18n = {}
      form.description_i18n = {}
      form.city_id = null
      form.lat = null
      form.lng = null
      form.images = []
      form.metadata = {}
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
    phone: details?.phone ?? null,
    website: details?.website ?? null,
    google_url: details?.google_url ?? null,
    wheelchair: details?.wheelchair_accessible ?? null,
    has_bathrooms: details?.has_bathrooms ?? null,
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

const save = async () => {
  if (!Object.values(form.name_i18n).some((v) => v?.trim())) {
    toast.add({ title: t('placesSlideover.toast.nameRequired'), color: 'error' })
    return
  }
  loading.value = true
  try {
    let saved: Place
    if (props.place?.id) {
      saved = await $fetch<Place>(`/api/places/${props.place.id}`, {
        method: 'PUT',
        body: form,
      })
      toast.add({ title: t('placesSlideover.toast.updated'), color: 'success' })
    } else {
      saved = await $fetch<Place>('/api/places', {
        method: 'POST',
        body: form,
      })
      toast.add({ title: t('placesSlideover.toast.created'), color: 'success' })
    }
    emit('saved', saved)
    emit('close', saved)
  } catch (e) {
    toast.add({
      title: t('placesSlideover.toast.errorTitle'),
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
        <UiPlaceSearch lang="en" @selected="onPlaceSelected" />

        <UiI18nTabs v-model="form.name_i18n" :label="t('placesSlideover.form.name')" required />

        <UiI18nTabs
          v-model="form.description_i18n"
          :label="t('placesSlideover.form.description')"
          type="textarea"
          :rows="3"
        />

        <UFormField :label="t('placesSlideover.form.city')">
          <USelect
            v-model="form.city_id"
            :items="(cities ?? []).map((c) => ({ label: c.name, value: c.id }))"
            :placeholder="t('placesSlideover.form.cityPlaceholder')"
            class="w-full"
          />
        </UFormField>

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

        <UiImageUploader
          v-model="form.images"
          :google-photos="googlePhotos"
          :upload-fn="uploadFromUrl"
        />
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
