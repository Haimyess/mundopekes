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

const LOCALES = [
  { key: 'es', label: 'Español' },
  { key: 'he', label: 'עברית' },
  { key: 'en', label: 'English' },
  { key: 'ru', label: 'Русский' },
]

const activeLocale = ref('he')

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

// Human-readable labels for the admin (hardcoded Spanish, no i18n needed here)
const AGE_LABELS: Record<string, string> = {
  'age.all': 'Todas las edades',
  'age.babies': 'Bebés (0-11m)',
  'age.toddlers': 'Pequeños (1-3 años)',
  'age.preschool': 'Preescolar (3-6 años)',
  'age.school': 'Escolar (6-12 años)',
  'age.teens': 'Adolescentes (12+)',
}
const SEASON_LABELS: Record<string, string> = {
  all: 'Todas',
  spring: 'Primavera',
  summer: 'Verano',
  autumn: 'Otoño',
  winter: 'Invierno',
}
const ageLabel = (key: string) => AGE_LABELS[key] ?? key
const seasonLabel = (value: string) => SEASON_LABELS[value] ?? value
const catName = (c: RefSubcat) =>
  c.name_i18n?.he || c.name_i18n?.es || Object.values(c.name_i18n ?? {})[0] || c.slug

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
    toast.add({ title: 'Ingresá un motivo de rechazo', color: 'error' })
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
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    })[props.suggestion?.status ?? 'pending']
)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-AR', {
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
  schedule: '',
  // Metadata fields
  meta_title_i18n: {} as Record<string, string>,
  meta_phone: '',
  meta_website: '',
  meta_opening_hours_text: '', // newline-separated for editing
  meta_hours_unknown: false,
})

const toggleBestSeason = (value: string) => {
  const idx = editForm.best_season.indexOf(value)
  if (idx === -1) editForm.best_season.push(value)
  else editForm.best_season.splice(idx, 1)
}

const toggleAgeId = (id: number) => {
  const idx = editForm.age_range_ids.indexOf(id)
  if (idx === -1) editForm.age_range_ids.push(id)
  else editForm.age_range_ids.splice(idx, 1)
}

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
  editForm.schedule = s.schedule ?? ''
  // Metadata
  editForm.meta_title_i18n = { ...(m.title_i18n ?? {}) }
  editForm.meta_phone = m.phone ?? ''
  editForm.meta_website = m.website ?? ''
  editForm.meta_opening_hours_text = Array.isArray(m.opening_hours_text)
    ? m.opening_hours_text.join('\n')
    : ''
  editForm.meta_hours_unknown = m.hours_unknown === true
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
}

const saveEdit = async () => {
  if (!props.suggestion) return
  const toast = useToast()

  if (!Object.values(editForm.name_i18n).some((v) => v?.trim())) {
    toast.add({ title: 'El nombre es requerido en al menos un idioma', color: 'error' })
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
        schedule: editForm.schedule,
        // Partial metadata — PUT will MERGE with existing, not overwrite
        metadata: {
          title_i18n: editForm.meta_title_i18n,
          phone: editForm.meta_phone || null,
          website: editForm.meta_website || null,
          opening_hours_text: editForm.meta_opening_hours_text
            ? editForm.meta_opening_hours_text.split('\n').filter(Boolean)
            : null,
          hours_unknown: editForm.meta_hours_unknown,
        },
      },
    })
    toast.add({ title: 'Sugerencia actualizada', color: 'success' })
    isEditing.value = false
    emit('rejected') // reutilizamos para refrescar la lista
  } catch (e) {
    toast.add({
      title: 'Error al guardar',
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
  if (!props.suggestion) return 'Sugerencia'
  const nameI18n = props.suggestion.name_i18n
  const name = nameI18n['he'] || nameI18n['es'] || Object.values(nameI18n)[0] || 'Sugerencia'
  return isEditing.value ? `Editando: ${name}` : name
})

// ── Metadata helpers ──────────────────────────────────────────────────────
// Local shape of suggestion.metadata (written by the wizard in Fases 3–6)
type SuggestionMeta = {
  title_i18n?: Record<string, string> | null
  phone?: string | null
  website?: string | null
  opening_hours_text?: string[] | null
  hours_unknown?: boolean | null
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
  <USlideover
    :open="open"
    :title="slideoverTitle"
    :close="{ onClick: () => emit('close') }"
    :ui="{ content: 'sm:max-w-xl' }"
    @update:open="
      (val) => {
        if (!val) emit('close')
      }
    "
  >
    <template #body>
      <div v-if="suggestion" class="flex flex-col gap-5 p-4">
        <!-- ── MODO VISTA ────────────────────────────────── -->
        <template v-if="!isEditing">
          <!-- Título de la actividad (distinto del nombre del lugar) -->
          <div v-if="meta.title_i18n && pickI18n(meta.title_i18n)">
            <p class="text-xs font-medium text-(--ui-text-muted) uppercase tracking-wide mb-1">
              Título de la actividad
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
            <p class="text-sm font-medium text-(--ui-text-muted) mb-1">Descripción</p>
            <p class="text-sm">
              {{
                (suggestion as any).description_i18n?.he ||
                (suggestion as any).description_i18n?.es ||
                ''
              }}
            </p>
          </div>

          <div>
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">Ubicación</p>
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
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">Contacto</p>
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
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">Tipo</p>
            <div class="flex flex-wrap gap-2">
              <UBadge v-for="t in suggestion.type" :key="t" color="neutral" variant="subtle">
                {{ t }}
              </UBadge>
            </div>
          </div>

          <div v-if="suggestion.best_season?.length">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">Mejor temporada</p>
            <div class="flex flex-wrap gap-2">
              <UBadge v-for="s in suggestion.best_season" :key="s" color="info" variant="subtle">
                {{ s }}
              </UBadge>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">Características</p>
            <div class="grid grid-cols-2 gap-2">
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  :name="suggestion.is_free ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                  :class="suggestion.is_free ? 'text-success-500' : 'text-(--ui-text-muted)'"
                  class="size-4"
                />
                Gratuito
              </div>
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  :name="suggestion.stroller_friendly ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                  :class="
                    suggestion.stroller_friendly ? 'text-success-500' : 'text-(--ui-text-muted)'
                  "
                  class="size-4"
                />
                Apto cochecito
              </div>
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  :name="suggestion.open_weekends ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                  :class="suggestion.open_weekends ? 'text-success-500' : 'text-(--ui-text-muted)'"
                  class="size-4"
                />
                Fines de semana
              </div>
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  :name="meta.has_shadow ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                  :class="meta.has_shadow ? 'text-success-500' : 'text-(--ui-text-muted)'"
                  class="size-4"
                />
                Sombra
              </div>
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  :name="meta.has_bathrooms ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                  :class="meta.has_bathrooms ? 'text-success-500' : 'text-(--ui-text-muted)'"
                  class="size-4"
                />
                Baños
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
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">Horario</p>
            <UAlert
              v-if="meta.hours_unknown"
              color="warning"
              variant="subtle"
              icon="i-lucide-clock"
              title="Horarios pendientes de revisión"
              description="El usuario no conocía los horarios al enviar la sugerencia."
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
            <p class="text-sm font-medium text-(--ui-text-muted) mb-1">Motivo de rechazo</p>
            <UAlert
              color="error"
              variant="subtle"
              :description="suggestion.rejection_reason"
              icon="i-lucide-alert-circle"
            />
          </div>

          <!-- Form rechazo inline -->
          <div v-if="showRejectForm" class="flex flex-col gap-3">
            <UFormField label="Motivo del rechazo" required>
              <UTextarea
                v-model="rejectionReason"
                placeholder="Explicá por qué se rechaza esta sugerencia..."
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
                Confirmar rechazo
              </UButton>
              <UButton color="neutral" variant="outline" @click="showRejectForm = false">
                Cancelar
              </UButton>
            </div>
          </div>
        </template>

        <!-- ── MODO EDICIÓN ──────────────────────────────── -->
        <template v-else>
          <!-- Nombre del lugar -->
          <UFormField label="Nombre del lugar" required>
            <UTabs
              v-model="activeLocale"
              :items="LOCALES.map((l) => ({ label: l.label, value: l.key }))"
              class="w-full"
            >
              <template #default="{ item }">
                <span class="flex items-center gap-1">
                  {{ item.label }}
                  <span
                    v-if="!editForm.name_i18n[item.value]?.trim()"
                    class="w-2 h-2 rounded-full bg-orange-400 inline-block"
                  />
                </span>
              </template>
            </UTabs>
            <UInput
              v-model="editForm.name_i18n[activeLocale]"
              :placeholder="`Nombre en ${LOCALES.find((l) => l.key === activeLocale)?.label}`"
              class="w-full mt-2"
            />
          </UFormField>

          <!-- Descripción del lugar -->
          <UFormField label="Descripción">
            <UTextarea
              v-model="editForm.description_i18n[activeLocale]"
              :placeholder="`Descripción en ${LOCALES.find((l) => l.key === activeLocale)?.label}...`"
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <!-- Título de la actividad (metadata.title_i18n) -->
          <UFormField label="Título de la actividad">
            <p class="text-xs text-(--ui-text-muted) mb-1">
              Mismo selector de idioma que el nombre
            </p>
            <UInput
              v-model="editForm.meta_title_i18n[activeLocale]"
              :placeholder="`Ej: Senderismo en ${LOCALES.find((l) => l.key === activeLocale)?.label}`"
              class="w-full"
            />
          </UFormField>

          <!-- Ubicación -->
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Ciudad">
              <UInput v-model="editForm.location.city" placeholder="Tel Aviv" class="w-full" />
            </UFormField>
            <UFormField label="Dirección">
              <UInput v-model="editForm.location.address" placeholder="Calle 123" class="w-full" />
            </UFormField>
          </div>

          <!-- Categoría (subcategorías DB, selección única) -->
          <UFormField label="Categoría">
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
                Cargando…
              </span>
            </div>
          </UFormField>

          <!-- Temporadas (VALUES desde DB) -->
          <UFormField label="Temporadas">
            <div class="flex flex-wrap gap-2 mt-1">
              <UBadge
                v-for="s in dbSeasons"
                :key="s.value"
                :color="editForm.best_season.includes(s.value) ? 'info' : 'neutral'"
                :variant="editForm.best_season.includes(s.value) ? 'solid' : 'subtle'"
                class="cursor-pointer select-none"
                @click="toggleBestSeason(s.value)"
              >
                {{ seasonLabel(s.value) }}
              </UBadge>
              <span v-if="!dbSeasons.length" class="text-xs text-(--ui-text-muted)">
                Cargando…
              </span>
            </div>
          </UFormField>

          <!-- Edades (IDs desde DB) -->
          <UFormField label="Edades">
            <div class="flex flex-wrap gap-2 mt-1">
              <UBadge
                v-for="a in dbAgeRanges"
                :key="a.id"
                :color="editForm.age_range_ids.includes(a.id) ? 'secondary' : 'neutral'"
                :variant="editForm.age_range_ids.includes(a.id) ? 'solid' : 'subtle'"
                class="cursor-pointer select-none"
                @click="toggleAgeId(a.id)"
              >
                {{ ageLabel(a.label_key) }}
              </UBadge>
              <span v-if="!dbAgeRanges.length" class="text-xs text-(--ui-text-muted)">
                Cargando…
              </span>
            </div>
          </UFormField>

          <!-- Contacto del lugar -->
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Teléfono">
              <UInput v-model="editForm.meta_phone" placeholder="+972 50 000 0000" class="w-full" />
            </UFormField>
            <UFormField label="Website">
              <UInput v-model="editForm.meta_website" placeholder="https://..." class="w-full" />
            </UFormField>
          </div>

          <!-- Horarios del lugar (texto de Google) -->
          <UFormField label="Horarios del lugar">
            <UTextarea
              v-model="editForm.meta_opening_hours_text"
              placeholder="Lunes: 09:00–17:00&#10;Martes: 09:00–17:00&#10;..."
              :rows="4"
              class="w-full"
            />
          </UFormField>

          <!-- Toggle horarios desconocidos -->
          <UCheckbox
            v-model="editForm.meta_hours_unknown"
            label="Horarios pendientes de revisión (no conocidos)"
          />

          <!-- Horario legible (campo legacy) -->
          <UFormField label="Horario (texto libre)">
            <UInput v-model="editForm.schedule" placeholder="Lun-Vie 9:00-18:00" class="w-full" />
          </UFormField>

          <div class="flex flex-col gap-2">
            <UCheckbox v-model="editForm.is_free" label="Gratuito" />
            <UCheckbox v-model="editForm.stroller_friendly" label="Apto cochecito" />
            <UCheckbox v-model="editForm.open_weekends" label="Abre fines de semana" />
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <!-- Footer modo edición -->
      <div v-if="isEditing" class="flex justify-between gap-3 w-full">
        <UButton color="neutral" variant="outline" @click="cancelEditing"> Cancelar </UButton>
        <UButton icon="i-lucide-save" :loading="actionLoading" @click="saveEdit">
          Guardar cambios
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
            Editar
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
            Rechazar
          </UButton>
          <UButton
            color="success"
            icon="i-lucide-check-circle"
            :loading="actionLoading"
            @click="handleApprove"
          >
            Aprobar y crear lugar
          </UButton>
        </div>
      </div>

      <!-- Footer modo vista — ya procesada -->
      <div v-else class="flex justify-between w-full">
        <UButton color="neutral" variant="outline" icon="i-lucide-pencil" @click="startEditing">
          Editar
        </UButton>
        <UButton
          color="error"
          variant="outline"
          icon="i-lucide-trash-2"
          :loading="actionLoading"
          @click="handleDelete"
        >
          Eliminar
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
