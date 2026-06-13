<script setup lang="ts">
// Gestión de imágenes (MVP): lista de URLs en modelValue + quick-add de fotos de
// Google (googlePhotos, read-only). La subida real de archivos queda para un follow-up
// (no hay endpoint de storage todavía).
//
// uploadFn: cuando se provee, al hacer click en una foto de Google se llama esta función
// antes de agregar la URL. Permite subir a Supabase Storage y guardar una URL permanente
// en lugar de la URL proxy efímera de Google.
const props = withDefaults(
  defineProps<{
    modelValue: string[]
    googlePhotos?: string[]
    label?: string
    uploadFn?: (url: string) => Promise<string>
  }>(),
  {
    googlePhotos: () => [],
    label: 'Imágenes',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const newUrl = ref('')

// Track which Google photos are currently being uploaded
const uploadingPhotos = ref<string[]>([])

const add = (url: string) => {
  const clean = url.trim()
  if (!clean || props.modelValue.includes(clean)) return
  emit('update:modelValue', [...props.modelValue, clean])
}

const addFromInput = () => {
  add(newUrl.value)
  newUrl.value = ''
}

const remove = (url: string) => {
  emit(
    'update:modelValue',
    props.modelValue.filter((u) => u !== url)
  )
}

const addGooglePhoto = async (url: string) => {
  if (props.modelValue.includes(url) || uploadingPhotos.value.includes(url)) return

  if (!props.uploadFn) {
    add(url)
    return
  }

  uploadingPhotos.value = [...uploadingPhotos.value, url]
  try {
    const permanentUrl = await props.uploadFn(url)
    emit('update:modelValue', [...props.modelValue, permanentUrl])
  } catch {
    // Graceful fallback: add the proxy URL rather than blocking the user
    emit('update:modelValue', [...props.modelValue, url])
  } finally {
    uploadingPhotos.value = uploadingPhotos.value.filter((u) => u !== url)
  }
}

const availableGooglePhotos = computed(() =>
  props.googlePhotos.filter((p) => !props.modelValue.includes(p))
)
</script>

<template>
  <UFormField :label="label">
    <div class="flex flex-col gap-3">
      <!-- Imágenes seleccionadas -->
      <div v-if="modelValue.length" class="flex flex-wrap gap-2">
        <div
          v-for="url in modelValue"
          :key="url"
          class="relative size-20 overflow-hidden rounded-md border border-(--ui-border)"
        >
          <img :src="url" alt="" class="size-full object-cover" />
          <button
            type="button"
            class="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
            aria-label="Quitar"
            @click="remove(url)"
          >
            <UIcon name="i-lucide-x" class="size-3" />
          </button>
        </div>
      </div>

      <!-- Agregar por URL -->
      <div class="flex gap-2">
        <UInput
          v-model="newUrl"
          placeholder="Pegá una URL de imagen…"
          class="flex-1"
          @keydown.enter.prevent="addFromInput"
        />
        <UButton color="neutral" variant="outline" icon="i-lucide-plus" @click="addFromInput">
          Agregar
        </UButton>
      </div>

      <!-- Quick-add de fotos de Google -->
      <div v-if="availableGooglePhotos.length" class="flex flex-col gap-1.5">
        <span class="text-xs text-(--ui-text-muted)">Fotos de Google (clic para agregar)</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="photo in availableGooglePhotos"
            :key="photo"
            type="button"
            :disabled="uploadingPhotos.includes(photo)"
            class="relative size-16 overflow-hidden rounded-md border border-(--ui-border) opacity-80 transition-opacity hover:opacity-100 disabled:cursor-wait disabled:opacity-50"
            @click="addGooglePhoto(photo)"
          >
            <img :src="photo" alt="" class="size-full object-cover" />
            <!-- Spinner overlay while uploading -->
            <div
              v-if="uploadingPhotos.includes(photo)"
              class="absolute inset-0 flex items-center justify-center bg-black/40"
            >
              <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-white" />
            </div>
          </button>
        </div>
      </div>
    </div>
  </UFormField>
</template>
