<script setup lang="ts">
// Galería unificada de selección de imágenes — reemplaza el diseño anterior
// (auto-agregar todas las fotos de Google la primera vez que la galería
// estaba vacía + una fila aparte de "quick add"). Ahora es un solo grid:
// cada foto (ya elegida o candidata de Google) es un click para
// seleccionar/deseleccionar, y la primera del array (`modelValue[0]`) es la
// portada — con un botón para cambiarla al pasar el mouse sobre otra
// seleccionada. Nada se pre-selecciona solo: el admin elige explícitamente.
// (La resolución automática de fotos si el admin no elige ninguna vive del
// lado del servidor — ver resolve-suggestion-images.ts — no acá.)
//
// uploadFn: cuando se provee, al seleccionar una foto de Google se llama esta
// función antes de agregarla. Permite subir a Supabase Storage y guardar una
// URL permanente en lugar de la URL proxy efímera de Google.
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
const uploadingPhotos = ref<string[]>([])

// Seleccionadas primero (en su orden — la primera es la portada), después
// las candidatas de Google todavía no elegidas.
const gallery = computed(() => [
  ...props.modelValue.map((url) => ({ url, selected: true })),
  ...props.googlePhotos
    .filter((url) => !props.modelValue.includes(url))
    .map((url) => ({ url, selected: false })),
])

const isCover = (url: string) => props.modelValue[0] === url

const select = async (url: string) => {
  if (uploadingPhotos.value.includes(url)) return

  if (props.uploadFn && url.startsWith('/api/places/photo?ref=')) {
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
    return
  }

  emit('update:modelValue', [...props.modelValue, url])
}

const deselect = (url: string) => {
  emit(
    'update:modelValue',
    props.modelValue.filter((u) => u !== url)
  )
}

const toggle = (item: { url: string; selected: boolean }) =>
  item.selected ? deselect(item.url) : select(item.url)

const setCover = (url: string) => {
  if (!props.modelValue.includes(url) || isCover(url)) return
  emit('update:modelValue', [url, ...props.modelValue.filter((u) => u !== url)])
}

const addFromInput = () => {
  const clean = newUrl.value.trim()
  if (clean && !props.modelValue.includes(clean)) {
    emit('update:modelValue', [...props.modelValue, clean])
  }
  newUrl.value = ''
}
</script>

<template>
  <UFormField :label="label">
    <div class="flex flex-col gap-3">
      <div v-if="gallery.length" class="flex flex-wrap gap-2">
        <div
          v-for="item in gallery"
          :key="item.url"
          class="group relative size-20 overflow-hidden rounded-md border-2 transition-colors"
          :class="
            item.selected ? 'border-primary' : 'border-(--ui-border) opacity-70 hover:opacity-100'
          "
        >
          <button
            type="button"
            class="block size-full"
            :disabled="uploadingPhotos.includes(item.url)"
            :aria-pressed="item.selected"
            :aria-label="item.selected ? 'Quitar imagen' : 'Seleccionar imagen'"
            @click="toggle(item)"
          >
            <img :src="item.url" alt="" class="size-full object-cover" />
          </button>

          <!-- Spinner mientras se sube a Storage -->
          <div
            v-if="uploadingPhotos.includes(item.url)"
            class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-white" />
          </div>

          <template v-else-if="item.selected">
            <div
              class="pointer-events-none absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-white"
            >
              <UIcon name="i-lucide-check" class="size-3" />
            </div>

            <!-- Portada: estrella fija en la seleccionada actual; en las demás
                 seleccionadas aparece al pasar el mouse, como botón para
                 promoverla a portada. -->
            <div
              v-if="isCover(item.url)"
              class="pointer-events-none absolute bottom-0.5 left-0.5 flex size-5 items-center justify-center rounded-full bg-warning text-white"
              title="Portada"
            >
              <UIcon name="i-lucide-star" class="size-3" />
            </div>
            <button
              v-else
              type="button"
              class="absolute bottom-0.5 left-0.5 hidden size-5 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
              title="Usar como portada"
              aria-label="Usar como portada"
              @click.stop="setCover(item.url)"
            >
              <UIcon name="i-lucide-star" class="size-3" />
            </button>
          </template>
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
    </div>
  </UFormField>
</template>
