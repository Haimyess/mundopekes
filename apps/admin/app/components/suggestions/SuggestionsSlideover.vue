<!-- app/components/suggestions/SuggestionsSlideover.vue -->
<!-- Vista detallada de una sugerencia con acciones: aprobar, rechazar, eliminar -->

<script setup lang="ts">
import type { Suggestion } from '~/composables/useSuggestions'

// const props = defineProps<{
//   suggestion: Suggestion | null
// }>()
const props = defineProps<{
  suggestion: Suggestion | null
  open: boolean
}>()

const emit = defineEmits<{
  approved: []
  rejected: []
  deleted: []
  close: []
}>()

const { approve, reject, remove, merge, actionLoading } = useSuggestions()
const toast = useToast()
const { t, locale } = useI18n()
const { uploadFromUrl } = useImageUpload()

// ── Place/Experience: linked place + possible-duplicate info ──────────────
type PlaceLite = { id: string; name_i18n: Record<string, string>; images: string[] | null }
type ActivityLite = { id: string; title_i18n: Record<string, string> }

const linkedPlace = ref<PlaceLite | null>(null)
const duplicatePlace = ref<PlaceLite | null>(null)
const duplicateActivity = ref<ActivityLite | null>(null)

const pickI18nName = (obj: Record<string, string> | null | undefined): string => {
  if (!obj) return ''
  return obj['he'] || obj['es'] || obj['en'] || Object.values(obj)[0] || ''
}

watch(
  () => props.suggestion,
  async (s) => {
    linkedPlace.value = null
    duplicatePlace.value = null
    duplicateActivity.value = null
    if (!s) return

    if (s.suggestion_type === 'experience_for_existing_place' && s.place_id) {
      try {
        linkedPlace.value = await $fetch<PlaceLite>(`/api/places/${s.place_id}`)
      } catch {
        // Linked place may have been deleted since the suggestion was created
      }
    }

    if (s.flagged_possible_duplicate) {
      try {
        if (s.possible_duplicate_of) {
          duplicatePlace.value = await $fetch<PlaceLite>(`/api/places/${s.possible_duplicate_of}`)
        } else if (s.possible_duplicate_activity_id) {
          duplicateActivity.value = await $fetch<ActivityLite>(
            `/api/activities/${s.possible_duplicate_activity_id}`
          )
        }
      } catch {
        // Flagged match may have been deleted/rejected since detection
      }
    }
  },
  { immediate: true }
)

const handleMerge = async (targetPlaceId: string) => {
  if (!props.suggestion) return
  await merge(props.suggestion.id, targetPlaceId)
  emit('approved')
  emit('close')
}

const suggestionTypeLabel = computed(() =>
  props.suggestion?.suggestion_type === 'experience_for_existing_place'
    ? t('suggestionsSlideover.typeExistingPlace')
    : t('suggestionsSlideover.typeNewPlace')
)

// ── Reference data (loaded once for the edit form) ────────────────────────
type RefSubcat = { id: string; name_i18n: Record<string, string>; slug: string }
type RefSeason = { value: string; label_key: string }
type RefAgeRange = { id: number; label_key: string }

const subcategories = ref<RefSubcat[]>([])
const dbSeasons = ref<RefSeason[]>([])
const dbAgeRanges = ref<RefAgeRange[]>([])

onMounted(async () => {
  try {
    const data = await $fetch<{
      subcategories: RefSubcat[]
      seasons: RefSeason[]
      ageRanges: RefAgeRange[]
    }>('/api/reference')
    subcategories.value = data.subcategories
    dbSeasons.value = data.seasons
    dbAgeRanges.value = data.ageRanges
  } catch {
    // Reference data is optional — the edit form degrades gracefully if unavailable
  }
})

// Human-readable labels passed down to UiEntityFormFields — same namespace
// pattern as ActivitiesSlideover so both editors share look & feel.
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
  placeName: t('suggestionsSlideover.form.placeNameLabel'),
  activityTitle: t('suggestionsSlideover.activityTitleLabel'),
  description: t('suggestionsSlideover.descriptionLabel'),
  city: t('suggestionsSlideover.form.cityLabel'),
  address: t('suggestionsSlideover.form.addressLabel'),
  addressPlaceholder: t('suggestionsSlideover.form.addressPlaceholder'),
  category: t('suggestionsSlideover.form.categoryLabel'),
  phone: t('suggestionsSlideover.form.phoneLabel'),
  website: t('suggestionsSlideover.form.websiteLabel'),
  ages: t('suggestionsSlideover.form.agesLabel'),
  seasons: t('suggestionsSlideover.form.seasonsLabel'),
  price: t('suggestionsSlideover.form.priceLabel'),
  free: t('suggestionsSlideover.features.free'),
  options: t('suggestionsSlideover.featuresLabel'),
  strollerFriendly: t('suggestionsSlideover.features.strollerFriendly'),
  openWeekends: t('suggestionsSlideover.form.openWeekendsLabel'),
  hasShadow: t('suggestionsSlideover.features.shadow'),
  hasBathrooms: t('suggestionsSlideover.features.bathrooms'),
  placeAttributes: t('entityForm.placeAttributes'),
  hasSafeRoom: t('entityForm.hasSafeRoom'),
  activityWebsite: t('entityForm.activityWebsite'),
  schedule: t('entityForm.schedule'),
  images: t('suggestionsSlideover.imagesLabel'),
  loading: t('suggestionsSlideover.loading'),
}))
const allAgeId = computed(() => dbAgeRanges.value.find((a) => a.label_key === 'age.all')?.id)

// Texto plano guardado en `schedule` — se arma con el idioma activo en el
// momento de guardar (t() reactivo a locale.value), pero al ser un string ya
// formateado queda fijo en ese idioma para esa sugerencia hasta que se
// vuelva a guardar. Ver DAY_ES anterior, que siempre guardaba en español.
const buildScheduleText = (schedule: WizardSchedule): string =>
  SCHEDULE_DAYS.map((day) => {
    const d = schedule[day]
    return d.open ? `${t(`days.${day}`)}: ${d.start}–${d.end}` : null
  })
    .filter(Boolean)
    .join(', ')

const showRejectForm = ref(false)
const rejectionReason = ref('')

const handleApprove = async () => {
  if (!props.suggestion) return
  await approve(props.suggestion.id)
  emit('approved')
  emit('close')
}

const handleReject = async () => {
  if (!props.suggestion) return
  if (!rejectionReason.value.trim()) {
    toast.add({ title: t('suggestionsSlideover.toast.rejectReasonRequired'), color: 'error' })
    return
  }
  await reject(props.suggestion.id, rejectionReason.value)
  emit('rejected')
  emit('close')
}

const handleDelete = async () => {
  if (!props.suggestion) return
  await remove(props.suggestion.id)
  emit('deleted')
  emit('close')
}

// Reset cuando cambia la sugerencia
watch(
  () => props.suggestion,
  () => {
    showRejectForm.value = false
    rejectionReason.value = ''
  }
)

// Helpers de display
const statusColor = computed(
  () =>
    ({
      pending: 'warning' as const,
      approved: 'success' as const,
      rejected: 'error' as const,
    })[props.suggestion?.status ?? 'pending']
)

const statusLabel = computed(
  () =>
    ({
      pending: t('suggestionsSlideover.status.pending'),
      approved: t('suggestionsSlideover.status.approved'),
      rejected: t('suggestionsSlideover.status.rejected'),
    })[props.suggestion?.status ?? 'pending']
)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(locale.value === 'en' ? 'en-US' : 'es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

// Modo edición
const isEditing = ref(false)

// Copia editable del form
const editForm = reactive({
  name_i18n: {} as Record<string, string>,
  description_i18n: {} as Record<string, string>,
  location: { city: '', address: '' },
  category_id: '' as string,
  age_range_ids: [] as number[],
  best_season: [] as string[], // VALUES (spring, summer, …)
  stroller_friendly: false,
  open_weekends: false,
  is_free: false,
  images: [] as string[],
  // Metadata fields
  meta_title_i18n: {} as Record<string, string>,
  meta_phone: '',
  meta_website: '',
  meta_activity_website: '',
  schedule_structured: defaultSchedule() as WizardSchedule,
  meta_hours_unknown: false,
  meta_has_shadow: false,
  meta_has_bathrooms: false,
  meta_price: null as number | null,
})

// Cuando abre el modo edición, copiar los valores actuales al form
const startEditing = () => {
  if (!props.suggestion) return
  const s = props.suggestion
  const m = (s.metadata as SuggestionMeta | null) ?? {}

  editForm.name_i18n = { ...(s.name_i18n ?? {}) }
  editForm.description_i18n = { ...(s.description_i18n ?? {}) }
  editForm.location.city = s.location?.city ?? ''
  editForm.location.address = s.location?.address ?? ''
  editForm.category_id = s.category_id ?? ''
  editForm.age_range_ids = [...((s.age_range as { ids?: number[] } | null)?.ids ?? [])]
  editForm.best_season = [...(s.best_season ?? [])]
  editForm.stroller_friendly = s.stroller_friendly
  editForm.open_weekends = s.open_weekends
  editForm.is_free = s.is_free
  editForm.images = [...(s.images ?? [])]
  // Metadata
  editForm.meta_title_i18n = { ...(m.title_i18n ?? {}) }
  editForm.meta_phone = m.phone ?? ''
  editForm.meta_website = m.website ?? ''
  editForm.meta_activity_website = m.activity_website ?? ''
  // Per-day, per-field merge (not a shallow object merge) — guards against
  // suggestions with a day present but missing/empty start-end, which would
  // otherwise render as blank time inputs in the manual editor.
  editForm.schedule_structured = mergeSchedule(m.schedule_structured)
  editForm.meta_hours_unknown = m.hours_unknown === true
  editForm.meta_has_shadow = m.has_shadow === true
  editForm.meta_has_bathrooms = m.has_bathrooms === true
  editForm.meta_price = m.price ?? null
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
}

const saveEdit = async () => {
  if (!props.suggestion) return
  const suggestionId = props.suggestion.id

  // experience_for_existing_place: no place fields shown (see showPlaceIdentity
  // above) — the activity title is what's actually required/edited here, not
  // the place name.
  const isExistingPlace = props.suggestion.suggestion_type === 'experience_for_existing_place'
  if (!isExistingPlace && !hasI18nContent(editForm.name_i18n)) {
    toast.add({ title: t('suggestionsSlideover.toast.nameRequired'), color: 'error' })
    return
  }
  if (isExistingPlace && !hasI18nContent(editForm.meta_title_i18n)) {
    toast.add({ title: t('suggestionsSlideover.toast.titleRequired'), color: 'error' })
    return
  }

  // actionLoading viene de useSuggestions() y se comparte entre aprobar/
  // rechazar/fusionar/guardar — runSaveAction recibe el ref en vez de tener
  // el suyo propio para no perder ese comportamiento (ver useEntitySave.ts).
  const result = await runSaveAction(
    actionLoading,
    () =>
      $fetch(`/api/suggestions/${suggestionId}`, {
        method: 'PUT',
        body: {
          // Place fields don't apply to experience_for_existing_place — omitted
          // (not just blanked) so the PUT handler's `!== undefined` guards
          // leave them untouched instead of overwriting name_i18n:{}/location:null
          // with editForm's unused defaults.
          ...(isExistingPlace
            ? {}
            : { name_i18n: editForm.name_i18n, location: editForm.location }),
          description_i18n: editForm.description_i18n,
          category_id: editForm.category_id || null,
          age_range: { ids: editForm.age_range_ids },
          best_season: editForm.best_season,
          stroller_friendly: editForm.stroller_friendly,
          open_weekends: editForm.open_weekends,
          is_free: editForm.is_free,
          images: editForm.images,
          schedule: editForm.meta_hours_unknown
            ? null
            : buildScheduleText(editForm.schedule_structured),
          // Partial metadata — PUT will MERGE with existing, not overwrite
          metadata: {
            title_i18n: editForm.meta_title_i18n,
            ...(isExistingPlace
              ? {}
              : { phone: editForm.meta_phone || null, website: editForm.meta_website || null }),
            hours_unknown: editForm.meta_hours_unknown,
            schedule_structured: editForm.meta_hours_unknown ? null : editForm.schedule_structured,
            has_shadow: editForm.meta_has_shadow,
            has_bathrooms: editForm.meta_has_bathrooms,
            activity_website: editForm.meta_activity_website || null,
            price: editForm.is_free ? null : editForm.meta_price,
          },
        },
      }),
    t('suggestionsSlideover.toast.saveError')
  )
  if (result === undefined) return

  toast.add({ title: t('suggestionsSlideover.toast.updated'), color: 'success' })
  isEditing.value = false
  emit('rejected') // reutilizamos para refrescar la lista
}

// ── Translation status (§F/§H) ─────────────────────────────────────────────
const { locales: contentLocales } = useContentLocales()

const translationFields = computed(() =>
  props.suggestion?.suggestion_type === 'experience_for_existing_place'
    ? ['title']
    : ['name', 'description', 'title']
)

const translationSummary = computed(() =>
  summarizeI18nStatus(props.suggestion?.i18n_status, translationFields.value, contentLocales)
)

const retryLoading = ref(false)

const retryTranslation = async () => {
  if (!props.suggestion) return
  const suggestionId = props.suggestion.id

  const result = await runSaveAction(
    retryLoading,
    () =>
      $fetch<{ retried: string[] }>(`/api/suggestions/${suggestionId}/retry-translation`, {
        method: 'POST',
      }),
    t('suggestionsSlideover.toast.retryError')
  )
  if (result === undefined) return

  if (result.retried.length === 0) {
    toast.add({ title: t('suggestionsSlideover.toast.retryNothing'), color: 'neutral' })
  } else {
    toast.add({ title: t('suggestionsSlideover.toast.retrySuccess'), color: 'success' })
    emit('rejected') // reutilizamos para refrescar la lista (mismo patrón que saveEdit)
  }
}

// Reset al cambiar sugerencia
watch(
  () => props.suggestion,
  () => {
    showRejectForm.value = false
    rejectionReason.value = ''
    isEditing.value = false
  }
)

const slideoverTitle = computed(() => {
  const fallback = t('suggestionsSlideover.fallbackTitle')
  if (!props.suggestion) return fallback
  const nameI18n = props.suggestion.name_i18n
  // experience_for_existing_place suggestions store name_i18n: {} — fall back
  // to the linked place's name (and the activity title, meta.title_i18n, is
  // shown separately in the body) so the title isn't just "Suggestion".
  const linkedName = linkedPlace.value ? pickI18nName(linkedPlace.value.name_i18n) : ''
  const name =
    nameI18n['he'] || nameI18n['es'] || Object.values(nameI18n)[0] || linkedName || fallback
  return isEditing.value ? `${t('suggestionsSlideover.editingPrefix')}: ${name}` : name
})

// ── Metadata helpers ──────────────────────────────────────────────────────
// Local shape of suggestion.metadata (written by the wizard in Fases 3–6)
type SuggestionMeta = {
  title_i18n?: Record<string, string> | null
  phone?: string | null
  website?: string | null
  // Website propio de la actividad (distinto del website del lugar arriba) —
  // confirmado 2026-08-28, mismo campo nuevo que Activity.
  activity_website?: string | null
  opening_hours_text?: string[] | null
  photos?: string[] | null
  hours_unknown?: boolean | null
  schedule_structured?: WizardSchedule | null
  has_shadow?: boolean | null
  has_bathrooms?: boolean | null
  price?: number | null
}

const meta = computed<SuggestionMeta>(
  () => (props.suggestion?.metadata as SuggestionMeta | null) ?? {}
)

// Returns the best available string from an i18n Record (he → es → en → first)
const pickI18n = (obj: Record<string, string> | null | undefined): string => {
  if (!obj) return ''
  return obj['he'] || obj['es'] || obj['en'] || Object.values(obj)[0] || ''
}
</script>

<template>
  <UiEntitySlideover :open="open" :title="slideoverTitle" @close="emit('close')">
    <template #body>
      <div v-if="suggestion" class="flex flex-col gap-5 p-4">
        <!-- ── MODO VISTA ────────────────────────────────── -->
        <template v-if="!isEditing">
          <!-- Título de la actividad (distinto del nombre del lugar) -->
          <div v-if="meta.title_i18n && pickI18n(meta.title_i18n)">
            <p class="text-xs font-medium text-(--ui-text-muted) uppercase tracking-wide mb-1">
              {{ t('suggestionsSlideover.activityTitleLabel') }}
            </p>
            <p class="text-base font-semibold">{{ pickI18n(meta.title_i18n) }}</p>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UBadge :color="statusColor" variant="subtle" size="lg">
                {{ statusLabel }}
              </UBadge>
              <UBadge
                :color="
                  suggestion.suggestion_type === 'experience_for_existing_place'
                    ? 'info'
                    : 'neutral'
                "
                variant="subtle"
                size="sm"
              >
                {{ suggestionTypeLabel }}
              </UBadge>
            </div>
            <span class="text-xs text-(--ui-text-muted)">
              {{ formatDate(suggestion.created_at) }}
            </span>
          </div>

          <!-- Estado de traducción (§F/§H) — complete/partial + reintento -->
          <div
            v-if="translationSummary.state !== 'unknown'"
            class="flex items-center justify-between gap-2 rounded-md border border-(--ui-border) px-3 py-2"
          >
            <div class="flex items-center gap-2 text-sm">
              <span class="text-xs font-medium text-(--ui-text-muted) uppercase tracking-wide">
                {{ t('suggestionsSlideover.translationsLabel') }}
              </span>
              <UBadge
                v-if="translationSummary.state === 'complete'"
                color="success"
                variant="subtle"
                size="sm"
                icon="i-lucide-check"
              >
                {{ t('suggestionsSlideover.translationsComplete') }}
              </UBadge>
              <UBadge
                v-else
                color="warning"
                variant="subtle"
                size="sm"
                icon="i-lucide-alert-triangle"
              >
                {{
                  t('suggestionsSlideover.translationsMissing', {
                    locales: translationSummary.missingLocales
                      .map((l) => l.toUpperCase())
                      .join(', '),
                  })
                }}
              </UBadge>
            </div>
            <UButton
              v-if="translationSummary.state === 'partial'"
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-lucide-refresh-cw"
              :loading="retryLoading"
              @click="retryTranslation"
            >
              {{ t('suggestionsSlideover.retryTranslation') }}
            </UButton>
          </div>

          <!-- Posible duplicado — flag de dedup + acción de un clic para fusionar -->
          <UAlert
            v-if="suggestion.flagged_possible_duplicate && (duplicatePlace || duplicateActivity)"
            color="warning"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :title="t('suggestionsSlideover.possibleDuplicateTitle')"
          >
            <template #description>
              <div class="flex items-center justify-between gap-3 mt-1">
                <span class="text-sm">
                  {{ duplicatePlace ? pickI18nName(duplicatePlace.name_i18n) : '' }}
                  {{ duplicateActivity ? pickI18nName(duplicateActivity.title_i18n) : '' }}
                </span>
                <UButton
                  v-if="duplicatePlace"
                  size="xs"
                  color="warning"
                  icon="i-lucide-merge"
                  :loading="actionLoading"
                  @click="handleMerge(duplicatePlace.id)"
                >
                  {{ t('suggestionsSlideover.mergeIntoThis') }}
                </UButton>
              </div>
            </template>
          </UAlert>

          <!-- Lugar ya existente: sugerencia experience_for_existing_place ────── -->
          <div v-if="suggestion.suggestion_type === 'experience_for_existing_place'">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
              {{ t('suggestionsSlideover.linkedPlaceLabel') }}
            </p>
            <NuxtLink
              v-if="linkedPlace"
              :to="`/places/${linkedPlace.id}`"
              class="flex items-center gap-3 p-2 rounded-md border border-(--ui-border) hover:bg-elevated/50"
            >
              <div class="size-12 shrink-0 overflow-hidden rounded-md bg-(--ui-bg-elevated)">
                <img
                  v-if="linkedPlace.images?.[0]"
                  :src="linkedPlace.images[0]"
                  alt=""
                  class="size-full object-cover"
                />
              </div>
              <span class="text-sm font-medium">{{ pickI18nName(linkedPlace.name_i18n) }}</span>
            </NuxtLink>
            <p v-else class="text-sm text-(--ui-text-muted)">
              {{ t('suggestionsSlideover.linkedPlaceMissing') }}
            </p>
          </div>

          <!-- Lugar propuesto: sugerencia new_place_with_experience ─────────── -->
          <template v-else>
            <div
              v-if="
                (suggestion as any).description_i18n?.he || (suggestion as any).description_i18n?.es
              "
            >
              <p class="text-sm font-medium text-(--ui-text-muted) mb-1">
                {{ t('suggestionsSlideover.descriptionLabel') }}
              </p>
              <p class="text-sm">
                {{
                  (suggestion as any).description_i18n?.he ||
                  (suggestion as any).description_i18n?.es ||
                  ''
                }}
              </p>
            </div>

            <div>
              <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
                {{ t('suggestionsSlideover.locationLabel') }}
              </p>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-map-pin" class="text-primary size-4 shrink-0" />
                <span class="text-sm">
                  {{ suggestion.location?.city ?? '—' }}
                  <span v-if="suggestion.location?.address" class="text-(--ui-text-muted)">
                    · {{ suggestion.location.address }}
                  </span>
                </span>
              </div>
            </div>

            <!-- Contacto del lugar -->
            <div v-if="meta.phone || meta.website">
              <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
                {{ t('suggestionsSlideover.contactLabel') }}
              </p>
              <div class="flex flex-col gap-1.5">
                <a
                  v-if="meta.phone"
                  :href="`tel:${meta.phone}`"
                  class="flex items-center gap-2 text-sm text-primary-500 hover:underline"
                >
                  <UIcon name="i-lucide-phone" class="size-4 shrink-0" />
                  {{ meta.phone }}
                </a>
                <a
                  v-if="meta.website"
                  :href="meta.website"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-2 text-sm text-primary-500 hover:underline"
                >
                  <UIcon name="i-lucide-globe" class="size-4 shrink-0" />
                  <span class="truncate">{{ meta.website }}</span>
                </a>
              </div>
            </div>
          </template>

          <div v-if="suggestion.type?.length">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
              {{ t('suggestionsSlideover.typeLabel') }}
            </p>
            <div class="flex flex-wrap gap-2">
              <UBadge v-for="type in suggestion.type" :key="type" color="neutral" variant="subtle">
                {{ type }}
              </UBadge>
            </div>
          </div>

          <div v-if="suggestion.best_season?.length">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
              {{ t('suggestionsSlideover.bestSeasonLabel') }}
            </p>
            <div class="flex flex-wrap gap-2">
              <UBadge v-for="s in suggestion.best_season" :key="s" color="info" variant="subtle">
                {{ SEASON_LABELS[s] ?? s }}
              </UBadge>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
              {{ t('suggestionsSlideover.featuresLabel') }}
            </p>
            <div class="grid grid-cols-2 gap-2">
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  :name="suggestion.is_free ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                  :class="suggestion.is_free ? 'text-success-500' : 'text-(--ui-text-muted)'"
                  class="size-4"
                />
                {{ t('suggestionsSlideover.features.free') }}
              </div>
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  :name="suggestion.stroller_friendly ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                  :class="
                    suggestion.stroller_friendly ? 'text-success-500' : 'text-(--ui-text-muted)'
                  "
                  class="size-4"
                />
                {{ t('suggestionsSlideover.features.strollerFriendly') }}
              </div>
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  :name="suggestion.open_weekends ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                  :class="suggestion.open_weekends ? 'text-success-500' : 'text-(--ui-text-muted)'"
                  class="size-4"
                />
                {{ t('suggestionsSlideover.features.weekends') }}
              </div>
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  :name="meta.has_shadow ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                  :class="meta.has_shadow ? 'text-success-500' : 'text-(--ui-text-muted)'"
                  class="size-4"
                />
                {{ t('suggestionsSlideover.features.shadow') }}
              </div>
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  :name="meta.has_bathrooms ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                  :class="meta.has_bathrooms ? 'text-success-500' : 'text-(--ui-text-muted)'"
                  class="size-4"
                />
                {{ t('suggestionsSlideover.features.bathrooms') }}
              </div>
            </div>
            <!-- Precio cuando no es gratuito -->
            <div
              v-if="!suggestion.is_free && meta.price"
              class="flex items-center gap-2 text-sm mt-2"
            >
              <UIcon name="i-lucide-shekel-sign" class="size-4 text-(--ui-text-muted)" />
              ₪{{ meta.price }}
            </div>
          </div>

          <!-- Horarios: hours_unknown → alerta; opening_hours_text → Google; fallback → schedule -->
          <div v-if="meta.hours_unknown || meta.opening_hours_text?.length || suggestion.schedule">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
              {{ t('suggestionsSlideover.scheduleLabel') }}
            </p>
            <UAlert
              v-if="meta.hours_unknown"
              color="warning"
              variant="subtle"
              icon="i-lucide-clock"
              :title="t('suggestionsSlideover.hoursUnknownTitle')"
              :description="t('suggestionsSlideover.hoursUnknownDescription')"
            />
            <div v-else-if="meta.opening_hours_text?.length" class="flex flex-col gap-0.5">
              <p v-for="(line, i) in meta.opening_hours_text" :key="i" class="text-sm">
                {{ line }}
              </p>
            </div>
            <p v-else-if="suggestion.schedule" class="text-sm">
              {{ suggestion.schedule }}
            </p>
          </div>

          <!-- Galería de sólo lectura: imágenes ya elegidas, o fotos de Google si -->
          <!-- todavía no se editó la sugerencia (antes se pedía entrar a "Editar" -->
          <!-- para siquiera verlas) -->
          <div v-if="(suggestion.images?.length ?? 0) > 0 || (meta.photos?.length ?? 0) > 0">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
              {{ t('suggestionsSlideover.imagesLabel') }}
            </p>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="url in suggestion.images?.length ? suggestion.images : (meta.photos ?? [])"
                :key="url"
                class="size-20 overflow-hidden rounded-md border border-(--ui-border)"
              >
                <img :src="url" alt="" class="size-full object-cover" />
              </div>
            </div>
          </div>

          <div v-if="suggestion.status === 'rejected' && suggestion.rejection_reason">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-1">
              {{ t('suggestionsSlideover.rejectionReasonLabel') }}
            </p>
            <UAlert
              color="error"
              variant="subtle"
              :description="suggestion.rejection_reason"
              icon="i-lucide-alert-circle"
            />
          </div>

          <!-- Form rechazo inline -->
          <div v-if="showRejectForm" class="flex flex-col gap-3">
            <UFormField :label="t('suggestionsSlideover.rejectForm.label')" required>
              <UTextarea
                v-model="rejectionReason"
                :placeholder="t('suggestionsSlideover.rejectForm.placeholder')"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <div class="flex gap-2">
              <UButton
                color="error"
                :loading="actionLoading"
                icon="i-lucide-x-circle"
                @click="handleReject"
              >
                {{ t('suggestionsSlideover.rejectForm.confirm') }}
              </UButton>
              <UButton color="neutral" variant="outline" @click="showRejectForm = false">
                {{ t('suggestionsSlideover.cancel') }}
              </UButton>
            </div>
          </div>
        </template>

        <!-- ── MODO EDICIÓN ──────────────────────────────── -->
        <template v-else>
          <!-- Lugar ya existente: no se editan nombre/ciudad/dirección/contacto -->
          <!-- acá (viven en el lugar real) — sólo un link de referencia. -->
          <div v-if="suggestion.suggestion_type === 'experience_for_existing_place'">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
              {{ t('suggestionsSlideover.linkedPlaceLabel') }}
            </p>
            <NuxtLink
              v-if="linkedPlace"
              :to="`/places/${linkedPlace.id}`"
              target="_blank"
              class="flex items-center gap-3 p-2 rounded-md border border-(--ui-border) hover:bg-elevated/50"
            >
              <div class="size-12 shrink-0 overflow-hidden rounded-md bg-(--ui-bg-elevated)">
                <img
                  v-if="linkedPlace.images?.[0]"
                  :src="linkedPlace.images[0]"
                  alt=""
                  class="size-full object-cover"
                />
              </div>
              <span class="text-sm font-medium">{{ pickI18nName(linkedPlace.name_i18n) }}</span>
            </NuxtLink>
            <p v-else class="text-sm text-(--ui-text-muted)">
              {{ t('suggestionsSlideover.linkedPlaceMissing') }}
            </p>
          </div>

          <UiEntityFormFields
            v-model:name-i18n="editForm.name_i18n"
            v-model:description-i18n="editForm.description_i18n"
            v-model:title-i18n="editForm.meta_title_i18n"
            v-model:city="editForm.location.city"
            v-model:address="editForm.location.address"
            v-model:category-id="editForm.category_id"
            v-model:phone="editForm.meta_phone"
            v-model:website="editForm.meta_website"
            v-model:age-range-ids="editForm.age_range_ids"
            v-model:best-season="editForm.best_season"
            v-model:schedule-structured="editForm.schedule_structured"
            v-model:hours-unknown="editForm.meta_hours_unknown"
            v-model:is-free="editForm.is_free"
            v-model:price="editForm.meta_price"
            v-model:stroller-friendly="editForm.stroller_friendly"
            v-model:open-weekends="editForm.open_weekends"
            v-model:has-shadow="editForm.meta_has_shadow"
            v-model:has-bathrooms="editForm.meta_has_bathrooms"
            v-model:activity-website="editForm.meta_activity_website"
            v-model:images="editForm.images"
            :show-place-identity="suggestion.suggestion_type !== 'experience_for_existing_place'"
            type="suggestion"
            :subcategory-options="subcategories"
            :age-range-options="dbAgeRanges"
            :season-options="dbSeasons"
            :age-labels="AGE_LABELS"
            :season-labels="SEASON_LABELS"
            :all-age-id="allAgeId"
            :google-hours-text="(meta.opening_hours_text ?? []).join('\n')"
            :google-photos="meta.photos ?? []"
            :upload-fn="uploadFromUrl"
            :labels="FORM_LABELS"
          />
        </template>
      </div>
    </template>

    <template #footer>
      <!-- Footer modo edición -->
      <div v-if="isEditing" class="flex justify-between gap-3 w-full">
        <UButton color="neutral" variant="outline" @click="cancelEditing">
          {{ t('suggestionsSlideover.cancel') }}
        </UButton>
        <UButton icon="i-lucide-save" :loading="actionLoading" @click="saveEdit">
          {{ t('suggestionsSlideover.saveChanges') }}
        </UButton>
      </div>

      <!-- Footer modo vista — pendiente -->
      <div v-else-if="suggestion?.status === 'pending'" class="flex justify-between gap-3 w-full">
        <div class="flex gap-2">
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            :loading="actionLoading"
            @click="handleDelete"
          />
          <UButton color="neutral" variant="outline" icon="i-lucide-pencil" @click="startEditing">
            {{ t('suggestionsSlideover.edit') }}
          </UButton>
        </div>

        <div class="flex gap-2">
          <UButton
            v-if="!showRejectForm"
            color="error"
            variant="outline"
            icon="i-lucide-x-circle"
            @click="showRejectForm = true"
          >
            {{ t('suggestionsSlideover.reject') }}
          </UButton>
          <UButton
            color="success"
            icon="i-lucide-check-circle"
            :loading="actionLoading"
            @click="handleApprove"
          >
            {{ t('suggestionsSlideover.approveAndCreate') }}
          </UButton>
        </div>
      </div>

      <!-- Footer modo vista — ya procesada -->
      <div v-else class="flex justify-between w-full">
        <UButton color="neutral" variant="outline" icon="i-lucide-pencil" @click="startEditing">
          {{ t('suggestionsSlideover.edit') }}
        </UButton>
        <UButton
          color="error"
          variant="outline"
          icon="i-lucide-trash-2"
          :loading="actionLoading"
          @click="handleDelete"
        >
          {{ t('suggestionsSlideover.delete') }}
        </UButton>
      </div>
    </template>
  </UiEntitySlideover>
</template>
