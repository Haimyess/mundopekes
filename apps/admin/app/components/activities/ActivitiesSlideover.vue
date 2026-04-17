<script setup lang="ts">
import type { Activity, Category, Place } from '~/types'

const props = defineProps<{
  activity?: Activity | null
  placeId?: string
}>()

const emit = defineEmits<{
  saved: []
  close: []
}>()

const toast = useToast()
const loading = ref(false)

const form = reactive({
  place_id: props.placeId ?? '',
  category_id: undefined as string | undefined,
  title: '',
  description: '',
  price: null as number | null,
  is_free: true,
  stroller_friendly: false,
  open_weekends: false,
  schedule: '',
  status: 'approved' as 'pending' | 'approved' | 'rejected',
})

const { data: categories } = await useFetch<Category[]>('/api/categories')
const { data: places } = props.placeId
  ? { data: ref(null) }
  : await useFetch<Place[]>('/api/places')

const placeOptions = computed(() =>
  (places.value ?? []).map(p => ({
    label: p.city?.name ? `${p.name} — ${p.city.name}` : p.name,
    value: p.id,
  }))
)

const categoryOptions = computed(() =>
  (categories.value ?? []).map(c => ({ label: c.name, value: c.id }))
)

watch(() => props.activity, (val) => {
  if (val) {
    form.place_id = val.place_id
    form.category_id = val.category_id ?? undefined
    form.title = val.title
    form.description = val.description ?? ''
    form.price = val.price
    form.is_free = val.is_free
    form.stroller_friendly = val.stroller_friendly
    form.open_weekends = val.open_weekends
    form.schedule = val.schedule ?? ''
    form.status = val.status
  } else {
    form.place_id = props.placeId ?? ''
    form.category_id = undefined
    form.title = ''
    form.description = ''
    form.price = null
    form.is_free = true
    form.stroller_friendly = false
    form.open_weekends = false
    form.schedule = ''
    form.status = 'approved'
  }
}, { immediate: true })

watch(() => form.is_free, (val) => {
  if (val) form.price = null
})

const save = async () => {
  if (!form.title) {
    toast.add({ title: 'El título es requerido', color: 'error' })
    return
  }
  if (!form.place_id) {
    toast.add({ title: 'Seleccioná un lugar', color: 'error' })
    return
  }
  loading.value = true
  try {
    if (props.activity?.id) {
      await $fetch(`/api/activities/${props.activity.id}`, {
        method: 'PUT',
        body: form,
      })
      toast.add({ title: 'Actividad actualizada', color: 'success' })
    } else {
      await $fetch('/api/activities', {
        method: 'POST',
        body: form,
      })
      toast.add({ title: 'Actividad creada', color: 'success' })
    }
    emit('saved')
    emit('close')
  } catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
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
        <UFormField v-if="!placeId" label="Lugar" required>
          <USelect
            v-model="form.place_id"
            :items="placeOptions"
            placeholder="Seleccioná un lugar"
            searchable
            class="w-full"
          />
        </UFormField>

        <UFormField label="Título" required>
          <UInput v-model="form.title" placeholder="Ej: Ski y snowboard" class="w-full" />
        </UFormField>

        <UFormField label="Descripción">
          <UTextarea v-model="form.description" placeholder="Descripción de la actividad..." :rows="3" class="w-full" />
        </UFormField>

        <UFormField label="Categoría">
          <USelect
            v-model="form.category_id"
            :items="categoryOptions"
            placeholder="Seleccioná una categoría"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Estado">
          <USelect
            v-model="form.status"
            :items="[
              { label: 'Aprobada', value: 'approved' },
              { label: 'Pendiente', value: 'pending' },
              { label: 'Rechazada', value: 'rejected' },
            ]"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Precio">
          <div class="flex flex-col gap-2 w-full">
            <UCheckbox v-model="form.is_free" label="Es gratuita" />
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

        <UFormField label="Horario">
          <UInput v-model="form.schedule" placeholder="Ej: Lun-Vie 9:00-18:00" class="w-full" />
        </UFormField>

        <UFormField label="Opciones">
          <div class="flex flex-col gap-2">
            <UCheckbox v-model="form.stroller_friendly" label="Apto para cochecito" />
            <UCheckbox v-model="form.open_weekends" label="Abre los fines de semana" />
          </div>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton color="neutral" variant="outline" @click="emit('close')">
          Cancelar
        </UButton>
        <UButton :loading="loading" @click="save">
          {{ activity ? 'Guardar cambios' : 'Crear actividad' }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>