<script setup lang="ts">
import type { Place } from '~/types'

const props = defineProps<{
  place?: Place | null
}>()

const emit = defineEmits<{
  saved: []
  close: []
}>()

const toast = useToast()
const loading = ref(false)

const LOCALES = [
  { key: 'es', label: 'Español' },
  { key: 'he', label: 'עברית' },
  { key: 'en', label: 'English' },
  { key: 'ru', label: 'Русский' },
]

const activeLocale = ref('he')

const form = reactive({
  name_i18n: {} as Record<string, string>,
  description_i18n: {} as Record<string, string>,
  city_id: null as number | null,
  lat: null as number | null,
  lng: null as number | null,
})

const { data: cities } = await useFetch('/api/cities')

watch(
  () => props.place,
  (val) => {
    if (val) {
      form.name_i18n = (val.name_i18n as Record<string, string>) ?? {}
      form.description_i18n = (val.description_i18n as Record<string, string>) ?? {}
      form.city_id = val.city_id
      form.lat = val.lat
      form.lng = val.lng
    } else {
      form.name_i18n = {}
      form.description_i18n = {}
      form.city_id = null
      form.lat = null
      form.lng = null
    }
  },
  { immediate: true }
)

const save = async () => {
  if (!Object.values(form.name_i18n).some((v) => v?.trim())) {
    toast.add({ title: 'El nombre es requerido en al menos un idioma', color: 'error' })
    return
  }
  loading.value = true
  try {
    if (props.place?.id) {
      await $fetch(`/api/places/${props.place.id}`, {
        method: 'PUT',
        body: form,
      })
      toast.add({ title: 'Lugar actualizado', color: 'success' })
    } else {
      await $fetch('/api/places', {
        method: 'POST',
        body: form,
      })
      toast.add({ title: 'Lugar creado', color: 'success' })
    }
    emit('saved')
    emit('close')
  } catch (e) {
    toast.add({
      title: 'Error',
      description: e instanceof Error ? e.message : String(e),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <USlideover
    :title="place ? 'Editar lugar' : 'Nuevo lugar'"
    :close="{ onClick: () => emit('close') }"
  >
    <template #body>
      <div class="flex flex-col gap-4 p-4">
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
                  v-if="!form.name_i18n[item.value]?.trim()"
                  class="w-2 h-2 rounded-full bg-orange-400 inline-block"
                />
              </span>
            </template>
          </UTabs>
          <UInput
            v-model="form.name_i18n[activeLocale]"
            :placeholder="`Nombre en ${LOCALES.find((l) => l.key === activeLocale)?.label}`"
            class="w-full mt-2"
          />
        </UFormField>

        <UFormField label="Descripción">
          <UTextarea
            v-model="form.description_i18n[activeLocale]"
            :placeholder="`Descripción en ${LOCALES.find((l) => l.key === activeLocale)?.label}...`"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Ciudad">
          <USelect
            v-model="form.city_id"
            :items="(cities as any[])?.map((c) => ({ label: c.name, value: c.id }))"
            placeholder="Seleccioná una ciudad"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Latitud">
            <UInput v-model="form.lat" type="number" placeholder="32.0853" class="w-full" />
          </UFormField>
          <UFormField label="Longitud">
            <UInput v-model="form.lng" type="number" placeholder="34.7818" class="w-full" />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton color="neutral" variant="outline" @click="emit('close')"> Cancelar </UButton>
        <UButton :loading="loading" @click="save">
          {{ place ? 'Guardar cambios' : 'Crear lugar' }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
