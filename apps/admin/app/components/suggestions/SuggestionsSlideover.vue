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
  age_range: { min: 0, max: 216 },
  type: [] as string[],
  best_season: [] as string[],
  stroller_friendly: false,
  open_weekends: false,
  is_free: false,
  schedule: '',
})

const ACTIVITY_TYPES = [
  'parque',
  'museo',
  'biblioteca',
  'indoor',
  'outdoor',
  'acuático',
  'cultural',
  'deportivo',
  'educativo',
  'granja',
  'playa',
]
const SEASONS = ['primavera', 'verano', 'otoño', 'invierno', 'todo el año']

const toggleType = (v: string) => {
  const idx = editForm.type.indexOf(v)
  if (idx === -1) editForm.type.push(v)
  else editForm.type.splice(idx, 1)
}

const toggleSeason = (v: string) => {
  const idx = editForm.best_season.indexOf(v)
  if (idx === -1) editForm.best_season.push(v)
  else editForm.best_season.splice(idx, 1)
}

// Cuando abre el modo edición, copiar los valores actuales al form
const startEditing = () => {
  if (!props.suggestion) return
  const s = props.suggestion
  editForm.name_i18n = s.name_i18n ?? {}
  editForm.description_i18n = s.description_i18n ?? {}
  editForm.location.city = s.location?.city ?? ''
  editForm.location.address = s.location?.address ?? ''
  editForm.age_range.min = s.age_range?.min ?? 0
  editForm.age_range.max = s.age_range?.max ?? 216
  editForm.type = [...(s.type ?? [])]
  editForm.best_season = [...(s.best_season ?? [])]
  editForm.stroller_friendly = s.stroller_friendly
  editForm.open_weekends = s.open_weekends
  editForm.is_free = s.is_free
  editForm.schedule = s.schedule ?? ''
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
        age_range: editForm.age_range,
        type: editForm.type,
        best_season: editForm.best_season,
        stroller_friendly: editForm.stroller_friendly,
        open_weekends: editForm.open_weekends,
        is_free: editForm.is_free,
        schedule: editForm.schedule,
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
          <UFormField label="Nombre" required>
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

          <UFormField label="Descripción">
            <UTextarea
              v-model="editForm.description_i18n[activeLocale]"
              :placeholder="`Descripción en ${LOCALES.find((l) => l.key === activeLocale)?.label}...`"
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Ciudad">
              <UInput v-model="editForm.location.city" placeholder="Tel Aviv" class="w-full" />
            </UFormField>
            <UFormField label="Dirección">
              <UInput v-model="editForm.location.address" placeholder="Calle 123" class="w-full" />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Edad mínima (meses)">
              <UInput v-model.number="editForm.age_range.min" type="number" class="w-full" />
            </UFormField>
            <UFormField label="Edad máxima (meses)">
              <UInput v-model.number="editForm.age_range.max" type="number" class="w-full" />
            </UFormField>
          </div>

          <UFormField label="Tipos">
            <div class="flex flex-wrap gap-2 mt-1">
              <UBadge
                v-for="type in ACTIVITY_TYPES"
                :key="type"
                :color="editForm.type.includes(type) ? 'primary' : 'neutral'"
                :variant="editForm.type.includes(type) ? 'solid' : 'subtle'"
                class="cursor-pointer select-none"
                @click="toggleType(type)"
              >
                {{ type }}
              </UBadge>
            </div>
          </UFormField>

          <UFormField label="Temporadas">
            <div class="flex flex-wrap gap-2 mt-1">
              <UBadge
                v-for="season in SEASONS"
                :key="season"
                :color="editForm.best_season.includes(season) ? 'info' : 'neutral'"
                :variant="editForm.best_season.includes(season) ? 'solid' : 'subtle'"
                class="cursor-pointer select-none"
                @click="toggleSeason(season)"
              >
                {{ season }}
              </UBadge>
            </div>
          </UFormField>

          <UFormField label="Horario">
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
