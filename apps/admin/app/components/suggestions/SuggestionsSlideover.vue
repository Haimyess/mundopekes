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

const { approve, reject, remove, actionLoading } = useSuggestions()
const toast = useToast()
const { t, locale } = useI18n()
const { uploadFromUrl } = useImageUpload()

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

// Human-readable labels passed down to UiActivityFields — same namespace pattern
// as ActivitiesSlideover so both editors share look & feel.
const AGE_LABELS = computed<Record<string, string>>(() => ({
  'age.all': t('suggestionsSlideover.ageLabels.all'),
  'age.babies': t('suggestionsSlideover.ageLabels.babies'),
  'age.toddlers': t('suggestionsSlideover.ageLabels.toddlers'),
  'age.preschool': t('suggestionsSlideover.ageLabels.preschool'),
  'age.school': t('suggestionsSlideover.ageLabels.school'),
  'age.teens': t('suggestionsSlideover.ageLabels.teens'),
}))
const SEASON_LABELS = computed<Record<string, string>>(() => ({
  all: t('suggestionsSlideover.seasonLabels.all'),
  spring: t('suggestionsSlideover.seasonLabels.spring'),
  summer: t('suggestionsSlideover.seasonLabels.summer'),
  autumn: t('suggestionsSlideover.seasonLabels.autumn'),
  winter: t('suggestionsSlideover.seasonLabels.winter'),
}))
const allAgeId = computed(() => dbAgeRanges.value.find((a) => a.label_key === 'age.all')?.id)
const catName = (c: RefSubcat) =>
  c.name_i18n?.he || c.name_i18n?.es || Object.values(c.name_i18n ?? {})[0] || c.slug

const DAY_ES: Record<keyof WizardSchedule, string> = {
  sunday: 'Domingo',
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
}
const buildScheduleText = (schedule: WizardSchedule): string =>
  SCHEDULE_DAYS.map((day) => {
    const d = schedule[day]
    return d.open ? `${DAY_ES[day]}: ${d.start}–${d.end}` : null
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
  const toast = useToast()

  if (!Object.values(editForm.name_i18n).some((v) => v?.trim())) {
    toast.add({ title: t('suggestionsSlideover.toast.nameRequired'), color: 'error' })
    return
  }

  actionLoading.value = true
  try {
    await $fetch(`/api/suggestions/${props.suggestion.id}`, {
      method: 'PUT',
      body: {
        name_i18n: editForm.name_i18n,
        description_i18n: editForm.description_i18n,
        location: editForm.location,
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
          phone: editForm.meta_phone || null,
          website: editForm.meta_website || null,
          hours_unknown: editForm.meta_hours_unknown,
          schedule_structured: editForm.meta_hours_unknown ? null : editForm.schedule_structured,
          has_shadow: editForm.meta_has_shadow,
          has_bathrooms: editForm.meta_has_bathrooms,
          price: editForm.is_free ? null : editForm.meta_price,
        },
      },
    })
    toast.add({ title: t('suggestionsSlideover.toast.updated'), color: 'success' })
    isEditing.value = false
    emit('rejected') // reutilizamos para refrescar la lista
  } catch (e) {
    toast.add({
      title: t('suggestionsSlideover.toast.saveError'),
      description: e instanceof Error ? e.message : String(e),
      color: 'error',
    })
  } finally {
    actionLoading.value = false
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
  const name = nameI18n['he'] || nameI18n['es'] || Object.values(nameI18n)[0] || fallback
  return isEditing.value ? `${t('suggestionsSlideover.editingPrefix')}: ${name}` : name
})

// ── Metadata helpers ──────────────────────────────────────────────────────
// Local shape of suggestion.metadata (written by the wizard in Fases 3–6)
type SuggestionMeta = {
  title_i18n?: Record<string, string> | null
  phone?: string | null
  website?: string | null
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
            <UBadge :color="statusColor" variant="subtle" size="lg">
              {{ statusLabel }}
            </UBadge>
            <span class="text-xs text-(--ui-text-muted)">
              {{ formatDate(suggestion.created_at) }}
            </span>
          </div>

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
                {{ s }}
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
          <UiI18nTabs
            v-model="editForm.name_i18n"
            :label="t('suggestionsSlideover.form.placeNameLabel')"
            required
          />

          <UiI18nTabs
            v-model="editForm.description_i18n"
            :label="t('suggestionsSlideover.descriptionLabel')"
            type="textarea"
            :rows="3"
          />

          <UiI18nTabs
            v-model="editForm.meta_title_i18n"
            :label="t('suggestionsSlideover.activityTitleLabel')"
          />

          <!-- Ubicación -->
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('suggestionsSlideover.form.cityLabel')">
              <UInput v-model="editForm.location.city" placeholder="Tel Aviv" class="w-full" />
            </UFormField>
            <UFormField :label="t('suggestionsSlideover.form.addressLabel')">
              <UInput
                v-model="editForm.location.address"
                :placeholder="t('suggestionsSlideover.form.addressPlaceholder')"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Categoría (subcategorías DB, selección única) -->
          <UFormField :label="t('suggestionsSlideover.form.categoryLabel')">
            <div class="flex flex-wrap gap-2 mt-1">
              <UBadge
                v-for="cat in subcategories"
                :key="cat.id"
                :color="editForm.category_id === cat.id ? 'primary' : 'neutral'"
                :variant="editForm.category_id === cat.id ? 'solid' : 'subtle'"
                class="cursor-pointer select-none"
                @click="editForm.category_id = editForm.category_id === cat.id ? '' : cat.id"
              >
                {{ catName(cat) }}
              </UBadge>
              <span v-if="!subcategories.length" class="text-xs text-(--ui-text-muted)">
                {{ t('suggestionsSlideover.loading') }}
              </span>
            </div>
          </UFormField>

          <!-- Contacto del lugar -->
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('suggestionsSlideover.form.phoneLabel')">
              <UInput v-model="editForm.meta_phone" placeholder="+972 50 000 0000" class="w-full" />
            </UFormField>
            <UFormField :label="t('suggestionsSlideover.form.websiteLabel')">
              <UInput v-model="editForm.meta_website" placeholder="https://..." class="w-full" />
            </UFormField>
          </div>

          <!-- Mismo bloque de campos que ActivitiesSlideover: edades, temporadas, -->
          <!-- gratis/precio, horario, opciones (incluye sombra/baños) e imágenes -->
          <UiActivityFields
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
            v-model:images="editForm.images"
            :age-range-options="dbAgeRanges"
            :season-options="dbSeasons"
            :age-labels="AGE_LABELS"
            :season-labels="SEASON_LABELS"
            :all-age-id="allAgeId"
            :google-hours-text="(meta.opening_hours_text ?? []).join('\n')"
            :google-photos="meta.photos ?? []"
            :upload-fn="uploadFromUrl"
            :ages-label="t('suggestionsSlideover.form.agesLabel')"
            :seasons-label="t('suggestionsSlideover.form.seasonsLabel')"
            :price-label="t('suggestionsSlideover.form.priceLabel')"
            :free-label="t('suggestionsSlideover.features.free')"
            :options-label="t('suggestionsSlideover.featuresLabel')"
            :stroller-friendly-label="t('suggestionsSlideover.features.strollerFriendly')"
            :open-weekends-label="t('suggestionsSlideover.form.openWeekendsLabel')"
            :has-shadow-label="t('suggestionsSlideover.features.shadow')"
            :has-bathrooms-label="t('suggestionsSlideover.features.bathrooms')"
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
