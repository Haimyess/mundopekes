<script setup lang="ts">
// Bloque de campos compartido entre los drawers de Sugerencias, Lugares y
// Actividades del admin. `type` decide qué secciones se muestran:
//   - suggestion: nombre del lugar + descripción + título de actividad +
//     ciudad/dirección + categoría (subcategorías) + teléfono/web del lugar +
//     UiActivityFields (edades/temporadas/precio/horario/website/features/
//     imágenes) — igual que el formulario que ya existía en
//     SuggestionsSlideover.
//   - place: nombre + descripción + ciudad/dirección + teléfono/web +
//     UiPlaceAttributesFields (gratis/pago, baños, bunker/refugio) +
//     imágenes. Sin categoría ni edades/temporadas: eso es de la actividad,
//     no del lugar. Confirmado 2026-08-28: stroller-friendly/open-weekends/
//     shade/horario se sacaron de Place — viven sólo en Activity ahora.
//   - activity: título + descripción + categoría (subcategorías, misma
//     fuente que suggestion) + UiActivityFields — igual que el formulario
//     que ya existía en ActivitiesSlideover.
// Sin i18n propio — todas las etiquetas llegan por prop (bag `labels`), igual
// que el resto de los componentes Ui* de este directorio.
import type { WizardSchedule } from '../../../domain/types/schedule'
import type { FieldI18nStatus } from '../../../domain/types/i18n-status'
import type { ScheduleEditorLabels } from './ScheduleEditor.vue'
import type { ImageUploaderLabels } from './ImageUploader.vue'

interface AgeOption {
  id: number
  label_key: string
}
interface SeasonOption {
  value: string
  label_key: string
}
interface SubcategoryOption {
  id: string
  name_i18n: Record<string, string>
  slug: string
}
interface CityOption {
  id: number
  name: string
}

// Copy de UiI18nTabs (botones "ver más idiomas", hints, tooltips de estado) —
// ver EntityFormLabels['i18nField'] más abajo.
export interface I18nFieldLabels {
  hint: string
  translateError: string
  showMore: string
  hideEmpty: string
  autoTranslated: string
  translationFailed: string
}

// Idioma de interfaz del admin (es/en, ver apps/admin/nuxt.config.ts) — decide
// en qué idioma se muestran los badges de categoría (name_i18n), separado del
// idioma de contenido que se está editando en los UiI18nTabs de arriba.
export interface EntityFormLabels {
  placeName: string
  activityTitle: string
  description: string
  city: string
  cityPlaceholder?: string
  address: string
  addressPlaceholder?: string
  category: string
  categoryPlaceholder?: string
  phone: string
  website: string
  ages: string
  seasons: string
  price: string
  free: string
  options: string
  strollerFriendly: string
  openWeekends: string
  hasShadow: string
  hasBathrooms: string
  placeAttributes: string
  hasSafeRoom: string
  activityWebsite: string
  schedule: string
  images: string
  loading: string
  i18nField: I18nFieldLabels
  scheduleEditor: ScheduleEditorLabels
  imageUploader: ImageUploaderLabels
}

const props = defineProps<{
  type: 'suggestion' | 'place' | 'activity'

  nameI18n?: Record<string, string>
  titleI18n?: Record<string, string>
  descriptionI18n: Record<string, string>
  nameI18nStatus?: FieldI18nStatus
  titleI18nStatus?: FieldI18nStatus
  descriptionI18nStatus?: FieldI18nStatus
  city?: string
  address?: string | null
  cityId?: number | null
  categoryId?: string | null
  phone?: string | null
  website?: string | null

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
  hasSafeRoom?: boolean
  activityWebsite?: string | null
  images: string[]

  cityOptions?: CityOption[]
  subcategoryOptions?: SubcategoryOption[]
  ageRangeOptions: AgeOption[]
  seasonOptions: SeasonOption[]
  ageLabels?: Record<string, string>
  seasonLabels?: Record<string, string>
  allAgeId?: number
  googleHoursText?: string
  googlePhotos?: string[]
  uploadFn?: (url: string) => Promise<string>

  // Sugerencias 'experience_for_existing_place' proponen sólo una actividad
  // para un lugar que ya existe (ver linked place) — el nombre/ciudad/
  // dirección/contacto del lugar no aplican ahí (viven en el lugar real, no
  // en la sugerencia). Default true; sólo se usa con type === 'suggestion'.
  showPlaceIdentity?: boolean

  locale?: string
  labels: EntityFormLabels
}>()

const emit = defineEmits<{
  'update:nameI18n': [value: Record<string, string>]
  'update:titleI18n': [value: Record<string, string>]
  'update:descriptionI18n': [value: Record<string, string>]
  'update:city': [value: string]
  'update:address': [value: string]
  'update:cityId': [value: number | null]
  'update:categoryId': [value: string | null]
  'update:phone': [value: string]
  'update:website': [value: string]
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
  'update:hasSafeRoom': [value: boolean]
  'update:activityWebsite': [value: string]
  'update:images': [value: string[]]
}>()

const nameI18nProxy = computed({
  get: () => props.nameI18n ?? {},
  set: (v: Record<string, string>) => emit('update:nameI18n', v),
})
const titleI18nProxy = computed({
  get: () => props.titleI18n ?? {},
  set: (v: Record<string, string>) => emit('update:titleI18n', v),
})
const descriptionI18nProxy = computed({
  get: () => props.descriptionI18n,
  set: (v: Record<string, string>) => emit('update:descriptionI18n', v),
})
const cityProxy = computed({
  get: () => props.city ?? '',
  set: (v: string) => emit('update:city', v),
})
const addressProxy = computed({
  get: () => props.address ?? '',
  set: (v: string) => emit('update:address', v),
})
const cityIdProxy = computed({
  get: () => props.cityId ?? null,
  set: (v: number | null) => emit('update:cityId', v),
})
// USelect no acepta `null` como modelValue (sólo `T | undefined`) — puente local
// sin cambiar el contrato público (props/emit) del componente, que sigue en
// `number | null` para calzar con `form.city_id` en places.
const cityIdSelectProxy = computed({
  get: () => cityIdProxy.value ?? undefined,
  set: (v: number | undefined) => (cityIdProxy.value = v ?? null),
})
const phoneProxy = computed({
  get: () => props.phone ?? '',
  set: (v: string) => emit('update:phone', v),
})
const websiteProxy = computed({
  get: () => props.website ?? '',
  set: (v: string) => emit('update:website', v),
})

const catName = (c: SubcategoryOption) =>
  (props.locale && c.name_i18n?.[props.locale]) ||
  c.name_i18n?.en ||
  c.name_i18n?.es ||
  Object.values(c.name_i18n ?? {})[0] ||
  c.slug

const cityItems = computed(() =>
  (props.cityOptions ?? []).map((c) => ({ label: c.name, value: c.id }))
)

// Sólo relevante para type === 'suggestion' (ver comentario en la prop) — el
// resto de los tipos siempre muestran su identidad (nombre/ciudad/contacto).
const showPlaceIdentity = computed(() => props.showPlaceIdentity !== false)
</script>

<template>
  <UiI18nTabs
    v-if="type === 'place' || (type === 'suggestion' && showPlaceIdentity)"
    v-model="nameI18nProxy"
    :label="labels.placeName"
    :status="nameI18nStatus"
    :labels="labels.i18nField"
    required
  />

  <UiI18nTabs
    v-model="descriptionI18nProxy"
    :label="labels.description"
    :status="descriptionI18nStatus"
    :labels="labels.i18nField"
    type="textarea"
    :rows="3"
  />

  <UiI18nTabs
    v-if="type === 'activity' || type === 'suggestion'"
    v-model="titleI18nProxy"
    :label="labels.activityTitle"
    :status="titleI18nStatus"
    :labels="labels.i18nField"
    :required="type === 'activity'"
  />

  <!-- Ubicación: sugerencia usa ciudad/dirección en texto libre (viene del wizard), -->
  <!-- lugar usa un select de ciudades ya cargadas + dirección en texto libre. -->
  <div v-if="type === 'suggestion' && showPlaceIdentity" class="grid grid-cols-2 gap-3">
    <UFormField :label="labels.city">
      <UInput v-model="cityProxy" placeholder="Tel Aviv" class="w-full" />
    </UFormField>
    <UFormField :label="labels.address">
      <UInput v-model="addressProxy" :placeholder="labels.addressPlaceholder" class="w-full" />
    </UFormField>
  </div>

  <template v-if="type === 'place'">
    <UFormField :label="labels.city">
      <USelect
        v-model="cityIdSelectProxy"
        :items="cityItems"
        :placeholder="labels.cityPlaceholder"
        class="w-full"
      />
    </UFormField>
    <UFormField :label="labels.address">
      <UInput v-model="addressProxy" :placeholder="labels.addressPlaceholder" class="w-full" />
    </UFormField>
  </template>

  <!-- Categoría: fuente unificada para activity y suggestion — subcategorías -->
  <!-- (badges, selección única desde /api/reference). Confirmado 2026-08-28: -->
  <!-- Activity ya no usa el select de categorías top-level. -->
  <UFormField
    v-if="(type === 'activity' || type === 'suggestion') && subcategoryOptions"
    :label="labels.category"
  >
    <div class="flex flex-wrap gap-2 mt-1">
      <UBadge
        v-for="cat in subcategoryOptions"
        :key="cat.id"
        :color="categoryId === cat.id ? 'primary' : 'neutral'"
        :variant="categoryId === cat.id ? 'solid' : 'subtle'"
        class="cursor-pointer select-none"
        @click="emit('update:categoryId', categoryId === cat.id ? '' : cat.id)"
      >
        {{ catName(cat) }}
      </UBadge>
      <span v-if="!subcategoryOptions.length" class="text-xs text-(--ui-text-muted)">
        {{ labels.loading }}
      </span>
    </div>
  </UFormField>

  <div
    v-if="type === 'place' || (type === 'suggestion' && showPlaceIdentity)"
    class="grid grid-cols-2 gap-3"
  >
    <UFormField :label="labels.phone">
      <UInput v-model="phoneProxy" placeholder="+972 50 000 0000" class="w-full" />
    </UFormField>
    <UFormField :label="labels.website">
      <UInput v-model="websiteProxy" placeholder="https://..." class="w-full" />
    </UFormField>
  </div>

  <UiPlaceAttributesFields
    v-if="type === 'place'"
    :is-free="isFree"
    :price="price"
    :has-bathrooms="hasBathrooms"
    :has-safe-room="hasSafeRoom ?? false"
    :label="labels.placeAttributes"
    :free-label="labels.free"
    :price-label="labels.price"
    :has-bathrooms-label="labels.hasBathrooms"
    :has-safe-room-label="labels.hasSafeRoom"
    @update:is-free="emit('update:isFree', $event)"
    @update:price="emit('update:price', $event)"
    @update:has-bathrooms="emit('update:hasBathrooms', $event)"
    @update:has-safe-room="emit('update:hasSafeRoom', $event)"
  />

  <UiActivityFields
    v-if="type === 'activity' || type === 'suggestion'"
    :age-range-ids="ageRangeIds"
    :best-season="bestSeason"
    :schedule-structured="scheduleStructured"
    :hours-unknown="hoursUnknown"
    :is-free="isFree"
    :price="price"
    :stroller-friendly="strollerFriendly"
    :open-weekends="openWeekends"
    :has-shadow="hasShadow"
    :has-bathrooms="hasBathrooms"
    :website="activityWebsite"
    :images="images"
    :age-range-options="ageRangeOptions"
    :season-options="seasonOptions"
    :age-labels="ageLabels"
    :season-labels="seasonLabels"
    :all-age-id="allAgeId"
    :google-hours-text="googleHoursText"
    :google-photos="googlePhotos"
    :upload-fn="uploadFn"
    :ages-label="labels.ages"
    :seasons-label="labels.seasons"
    :price-label="labels.price"
    :free-label="labels.free"
    :options-label="labels.options"
    :stroller-friendly-label="labels.strollerFriendly"
    :open-weekends-label="labels.openWeekends"
    :has-shadow-label="labels.hasShadow"
    :has-bathrooms-label="labels.hasBathrooms"
    :website-label="labels.activityWebsite"
    :images-label="labels.images"
    :loading-label="labels.loading"
    :schedule-labels="labels.scheduleEditor"
    :image-uploader-labels="labels.imageUploader"
    @update:age-range-ids="emit('update:ageRangeIds', $event)"
    @update:best-season="emit('update:bestSeason', $event)"
    @update:schedule-structured="emit('update:scheduleStructured', $event)"
    @update:hours-unknown="emit('update:hoursUnknown', $event)"
    @update:is-free="emit('update:isFree', $event)"
    @update:price="emit('update:price', $event)"
    @update:stroller-friendly="emit('update:strollerFriendly', $event)"
    @update:open-weekends="emit('update:openWeekends', $event)"
    @update:has-shadow="emit('update:hasShadow', $event)"
    @update:has-bathrooms="emit('update:hasBathrooms', $event)"
    @update:website="emit('update:activityWebsite', $event)"
    @update:images="emit('update:images', $event)"
  />

  <UiImageUploader
    v-if="type === 'place'"
    :model-value="images"
    :google-photos="googlePhotos ?? []"
    :upload-fn="uploadFn"
    :label="labels.images"
    :labels="labels.imageUploader"
    @update:model-value="emit('update:images', $event)"
  />
</template>
