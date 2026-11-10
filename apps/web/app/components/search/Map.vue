<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { GeoBounds } from '@mundopekes/core'
import type { SearchPin } from '#shared/types/search'
import type { MapPin } from '~/components/map/Canvas.vue'

interface Props {
  pins: readonly SearchPin[]
  highlightedId?: string | null
}

const props = withDefaults(defineProps<Props>(), { highlightedId: null })

const emit = defineEmits<{ highlight: [id: string | null] }>()

const MOVE_DEBOUNCE_MS = 400

const { t, locale } = useI18n()
const { tc } = useI18nContent()
const { state, linkTo } = useSearchState()

const activeId = ref<string | null>(null)
const isSearchOnMove = ref(!!state.value.bbox)

const pinLabel = (pin: SearchPin) => {
  if (pin.isFree || pin.price === 0) return t('results.free')
  if (pin.price !== null) return formatPrice(pin.price, locale.value)
  return t(`results.kind.${pin.kind}`)
}

const mapPins = computed<MapPin[]>(() =>
  props.pins.map((pin) => ({
    id: pin.id,
    lat: pin.location.lat,
    lng: pin.location.lng,
    label: pinLabel(pin),
    title: tc(pin.title),
  }))
)

const activePin = computed(() => props.pins.find(({ id }) => id === activeId.value) ?? null)

const searchArea = useDebounceFn(
  (bbox: GeoBounds) => navigateTo(linkTo({ bbox })),
  MOVE_DEBOUNCE_MS
)

const handleSelect = (id: string) => {
  activeId.value = id
}
const handleCloseCard = () => {
  activeId.value = null
}
const handleHighlight = (id: string | null) => emit('highlight', id)
const handleMove = (bounds: GeoBounds) => {
  if (isSearchOnMove.value) void searchArea(bounds)
}
const handleSearchOnMoveChange = (isEnabled: boolean) => {
  isSearchOnMove.value = isEnabled
  if (!isEnabled && state.value.bbox) void navigateTo(linkTo({ bbox: undefined }))
}

watch(
  () => props.pins,
  (pins) => {
    if (activeId.value && !pins.some(({ id }) => id === activeId.value)) activeId.value = null
  }
)
</script>

<template>
  <div class="search-map">
    <MapCanvas
      :pins="mapPins"
      :label="t('results.map.label')"
      :active-id="activeId"
      :highlighted-id="highlightedId"
      :should-fit-pins="!state.bbox"
      @select="handleSelect"
      @highlight="handleHighlight"
      @move="handleMove"
    />
    <div class="search-map__controls">
      <UiSwitch
        :model-value="isSearchOnMove"
        :label="t('results.map.searchOnMove')"
        @update:model-value="handleSearchOnMoveChange"
      />
    </div>
    <p v-if="!pins.length" class="search-map__empty" role="status">{{ t('results.map.empty') }}</p>
    <div v-if="activePin" class="search-map__card">
      <UiButton
        variant="ghost"
        size="sm"
        icon="i-hugeicons-cancel-01"
        class="search-map__close"
        :aria-label="t('layout.close')"
        @click="handleCloseCard"
      />
      <SearchResultCard :item="activePin" :heading-level="3" />
    </div>
  </div>
</template>

<style scoped>
.search-map {
  position: relative;
  inline-size: 100%;
  block-size: 100%;
  overflow: hidden;
  border-radius: var(--mp-r-panel);
  background: var(--mp-skeleton);
}

.search-map__controls {
  position: absolute;
  z-index: 500;
  inset-block-start: 12px;
  inset-inline-start: 12px;
  padding: 6px 12px;
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  box-shadow: 0 2px 10px rgb(0 0 0 / 12%);
}

.search-map__empty {
  position: absolute;
  z-index: 500;
  inset-block-start: 50%;
  inset-inline: 16px;
  margin: 0;
  padding: 12px 16px;
  border-radius: var(--mp-r-panel-sm);
  background: var(--mp-surface);
  color: var(--mp-ink);
  text-align: center;
}

.search-map__card {
  position: absolute;
  z-index: 500;
  inset-block-end: 16px;
  inset-inline: 16px;
  max-inline-size: 200px;
  padding: 10px;
  border-radius: var(--mp-r-panel-sm);
  background: var(--mp-surface);
  box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
}

.search-map__close {
  position: absolute;
  z-index: 1;
  inset-block-start: 14px;
  inset-inline-end: 14px;
  background: var(--mp-surface);
}
</style>
