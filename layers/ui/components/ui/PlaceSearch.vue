<script setup lang="ts">
// Buscador de lugares de Google (input + dropdown de resultados). Envuelve
// usePlacesSearch del layer domain. Al elegir un resultado trae los detalles y emite
// `selected` con { place, details } para que el consumidor mapee a su propio formulario.
import type { PlaceSearchResult, PlaceDetails } from '../../../domain/composables/usePlacesSearch'

const LANGS = ['he', 'en', 'es', 'ru'] as const

const props = withDefaults(
  defineProps<{
    lang?: string
    label?: string
    placeholder?: string
    clearLabel?: string
  }>(),
  {
    lang: 'he',
    label: 'Search place on Google',
    placeholder: 'Type the place name…',
    clearLabel: 'Clear',
  }
)

const emit = defineEmits<{
  selected: [payload: { place: PlaceSearchResult; details: PlaceDetails | null }]
  clear: []
}>()

const selectedLang = ref(props.lang)

const switchLang = (lang: string) => {
  selectedLang.value = lang
  search.clear()
}

const search = usePlacesSearch(() => selectedLang.value)

const query = ref('')
const selectedName = ref('')

const onInput = (val: string) => {
  query.value = val
  selectedName.value = ''
  search.search(val)
}

const selectPlace = async (place: PlaceSearchResult) => {
  selectedName.value = place.name
  query.value = place.name
  search.clear()
  const details = await search.fetchDetails(place.google_place_id)
  emit('selected', { place, details })
}

const reset = () => {
  query.value = ''
  selectedName.value = ''
  search.clear()
  emit('clear')
}
</script>

<template>
  <UFormField :label="label">
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <UInput
          :model-value="query"
          :placeholder="placeholder"
          icon="i-lucide-search"
          class="w-full"
          :loading="search.loading.value || search.loadingDetails.value"
          @update:model-value="onInput"
        >
          <template v-if="selectedName" #trailing>
            <UButton
              color="neutral"
              variant="link"
              size="xs"
              icon="i-lucide-x"
              :aria-label="clearLabel"
              @click="reset"
            />
          </template>
        </UInput>

        <!-- Resultados -->
        <div
          v-if="search.results.value.length && !selectedName"
          class="absolute inset-x-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg border border-(--ui-border) bg-(--ui-bg) shadow-lg"
        >
          <button
            v-for="place in search.results.value"
            :key="place.google_place_id"
            type="button"
            class="flex w-full items-center gap-3 border-b border-(--ui-border-muted) px-4 py-3 text-start last:border-b-0 hover:bg-(--ui-bg-elevated)"
            @click="selectPlace(place)"
          >
            <div
              class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-(--ui-bg-muted)"
            >
              <img
                v-if="place.photo_url"
                :src="place.photo_url"
                :alt="place.name"
                class="size-full object-cover"
              />
              <UIcon v-else name="i-lucide-map-pin" class="size-4 text-(--ui-text-muted)" />
            </div>
            <div class="flex min-w-0 flex-col">
              <span class="truncate text-sm font-medium">{{ place.name }}</span>
              <span class="truncate text-xs text-(--ui-text-muted)">{{ place.address }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Selector de idioma de búsqueda -->
      <div class="flex shrink-0 overflow-hidden rounded-md border border-(--ui-border)">
        <button
          v-for="lang in LANGS"
          :key="lang"
          type="button"
          class="px-2 py-1 text-xs uppercase transition-colors"
          :class="
            selectedLang === lang
              ? 'bg-(--ui-primary) text-(--ui-primary-contrast) font-semibold'
              : 'bg-(--ui-bg) text-(--ui-text-muted) hover:bg-(--ui-bg-elevated)'
          "
          @click="switchLang(lang)"
        >
          {{ lang }}
        </button>
      </div>
    </div>
  </UFormField>
</template>
