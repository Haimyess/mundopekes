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
watch(() => props.suggestion, () => {
  showRejectForm.value = false
  rejectionReason.value = ''
})

// Helpers de display
const statusColor = computed(() => ({
  pending: 'warning' as const,
  approved: 'success' as const,
  rejected: 'error' as const
}[props.suggestion?.status ?? 'pending']))

const statusLabel = computed(() => ({
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada'
}[props.suggestion?.status ?? 'pending']))

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

// Modo edición
const isEditing = ref(false)

// Copia editable del form
const editForm = reactive({
  name: '',
  description: '',
  location: { city: '', address: '' },
  age_range: { min: 0, max: 216 },
  type: [] as string[],
  best_season: [] as string[],
  stroller_friendly: false,
  open_weekends: false,
  is_free: false,
  schedule: ''
})

const ACTIVITY_TYPES = [
  'parque', 'museo', 'biblioteca', 'indoor', 'outdoor',
  'acuático', 'cultural', 'deportivo', 'educativo', 'granja', 'playa'
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
  editForm.name = s.name
  editForm.description = s.description ?? ''
  editForm.location.city = s.location?.city ?? ''
  editForm.location.address = s.location?.address ?? ''
  editForm.age_range.min = (s.age_range as any)?.min ?? 0
  editForm.age_range.max = (s.age_range as any)?.max ?? 216
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

  if (!editForm.name.trim()) {
    toast.add({ title: 'El nombre es requerido', color: 'error' })
    return
  }

  actionLoading.value = true
  try {
    await $fetch(`/api/suggestions/${props.suggestion.id}`, {
      method: 'PUT',
      body: {
        name: editForm.name,
        description: editForm.description,
        location: editForm.location,
        age_range: editForm.age_range,
        type: editForm.type,
        best_season: editForm.best_season,
        stroller_friendly: editForm.stroller_friendly,
        open_weekends: editForm.open_weekends,
        is_free: editForm.is_free,
        schedule: editForm.schedule
      }
    })
    toast.add({ title: 'Sugerencia actualizada', color: 'success' })
    isEditing.value = false
    emit('rejected') // reutilizamos para refrescar la lista
  } catch (e: any) {
    toast.add({ title: 'Error al guardar', description: e.message, color: 'error' })
  } finally {
    actionLoading.value = false
  }
}

// Reset al cambiar sugerencia
watch(() => props.suggestion, () => {
  showRejectForm.value = false
  rejectionReason.value = ''
  isEditing.value = false
})
</script>

<template>
  <USlideover
    :open="open"
    :title="isEditing ? `Editando: ${suggestion?.name}` : suggestion?.name ?? 'Sugerencia'"
    :close="{ onClick: () => emit('close') }"
    :ui="{ content: 'sm:max-w-xl' }"
    @update:open="(val) => { if (!val) emit('close') }"
  >
    <template #body>
      <div v-if="suggestion" class="flex flex-col gap-5 p-4">
        <!-- ── MODO VISTA ────────────────────────────────── -->
        <template v-if="!isEditing">
          <div class="flex items-center justify-between">
            <UBadge :color="statusColor" variant="subtle" size="lg">
              {{ statusLabel }}
            </UBadge>
            <span class="text-xs text-(--ui-text-muted)">
              {{ formatDate(suggestion.created_at) }}
            </span>
          </div>

          <div v-if="suggestion.description">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-1">
              Descripción
            </p>
            <p class="text-sm">
              {{ suggestion.description }}
            </p>
          </div>

          <div>
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
              Ubicación
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

          <div v-if="suggestion.type?.length">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
              Tipo
            </p>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="t in suggestion.type"
                :key="t"
                color="neutral"
                variant="subtle"
              >
                {{ t }}
              </UBadge>
            </div>
          </div>

          <div v-if="suggestion.best_season?.length">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
              Mejor temporada
            </p>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="s in suggestion.best_season"
                :key="s"
                color="info"
                variant="subtle"
              >
                {{ s }}
              </UBadge>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium text-(--ui-text-muted) mb-2">
              Características
            </p>
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
                  :class="suggestion.stroller_friendly ? 'text-success-500' : 'text-(--ui-text-muted)'"
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
            </div>
          </div>

          <div v-if="suggestion.schedule">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-1">
              Horario
            </p>
            <p class="text-sm">
              {{ suggestion.schedule }}
            </p>
          </div>

          <div v-if="suggestion.status === 'rejected' && suggestion.rejection_reason">
            <p class="text-sm font-medium text-(--ui-text-muted) mb-1">
              Motivo de rechazo
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
            <UInput v-model="editForm.name" class="w-full" />
          </UFormField>

          <UFormField label="Descripción">
            <UTextarea v-model="editForm.description" :rows="3" class="w-full" />
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
        <UButton color="neutral" variant="outline" @click="cancelEditing">
          Cancelar
        </UButton>
        <UButton
          icon="i-lucide-save"
          :loading="actionLoading"
          @click="saveEdit"
        >
          Guardar cambios
        </UButton>
      </div>

      <!-- Footer modo vista — pendiente -->
      <div
        v-else-if="suggestion?.status === 'pending'"
        class="flex justify-between gap-3 w-full"
      >
        <div class="flex gap-2">
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            :loading="actionLoading"
            @click="handleDelete"
          />
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-pencil"
            @click="startEditing"
          >
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
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-pencil"
          @click="startEditing"
        >
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
