<script setup lang="ts">
import { usePlacesSearch } from '~/composables/usePlacesSearch'
import { useLocalPlaceSearch } from '~/composables/useLocalPlaceSearch'
import type { LocalPlaceMatch } from '~/composables/useLocalPlaceSearch'
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'
import { useI18nContent } from '~/composables/useI18nContent'

const wizard = useSuggestionWizard()
const search = usePlacesSearch()
const localSearch = useLocalPlaceSearch()
const { t } = useI18n()
const { tc } = useI18nContent()
const { geocode } = useGeocode()

const localQuery = ref('')
const showLocalResults = computed(
  () => localSearch.results.value.length > 0 && !wizard.state.value.matchedPlace
)

const query = ref('')
const showResults = computed(() => search.results.value.length > 0 && !wizard.hasPlace.value)
const showPlaceExtra = ref(false)

// Geocoding status for manual entry feedback
type GeoStatus = 'idle' | 'loading' | 'found' | 'not_found'
const geoStatus = ref<GeoStatus>('idle')

// ── Local DB search (primary) ───────────────────────────────────────
const onLocalInput = (val: string) => {
  localQuery.value = val
  localSearch.search(val)
}

const selectMatchedPlace = (place: LocalPlaceMatch) => {
  wizard.setMatchedPlace(place)
  localSearch.clear()
  localQuery.value = ''
}

const searchAgain = () => {
  wizard.clearMatchedPlace()
  localQuery.value = ''
}

// ── "Add a new place" sub-flow (Google search or manual entry) ───────
const onInput = (val: string) => {
  query.value = val
  if (!wizard.state.value.isManual) search.search(val)
}

const selectPlace = async (place: (typeof search.results.value)[0]) => {
  wizard.setPlace(place)
  search.clear()
  query.value = place.name
  showPlaceExtra.value = false

  const details = await search.fetchDetails(place.google_place_id)
  if (details) {
    wizard.setPlace(place, details)
  }
}

const toggleManual = () => {
  wizard.state.value.isManual = !wizard.state.value.isManual
  if (wizard.state.value.isManual) {
    search.clear()
    query.value = ''
    wizard.clearPlace()
    geoStatus.value = 'idle'
  }
}

// Geocode on blur of city or address field (fire-and-forget — never blocks submit)
const triggerGeocode = async () => {
  const parts = [wizard.state.value.manualCity, wizard.state.value.manualAddress].filter(Boolean)
  if (parts.length === 0) return
  geoStatus.value = 'loading'
  const result = await geocode(parts.join(', '))
  if (result) {
    wizard.state.value.manualLat = result.lat
    wizard.state.value.manualLng = result.lng
    geoStatus.value = 'found'
  } else {
    geoStatus.value = 'not_found'
  }
}

const hasPlaceExtra = computed(() => {
  const pi = wizard.state.value.placeInfo
  return !!(pi.phone || pi.website || pi.openingHoursText)
})
</script>

<template>
  <div class="step-lugar">
    <!-- ── Lugar ya confirmado (match en nuestra propia DB) ────────────── -->
    <div v-if="wizard.state.value.matchedPlace" class="step-lugar__matched">
      <div class="step-lugar__matched-photo">
        <img
          v-if="wizard.state.value.matchedPlace.thumbnail"
          :src="wizard.state.value.matchedPlace.thumbnail"
          :alt="tc(wizard.state.value.matchedPlace.name_i18n)"
        />
        <UiIcon v-else name="i-lucide-map-pin" size="sm" />
      </div>
      <div class="step-lugar__matched-info">
        <span class="step-lugar__matched-name">{{
          tc(wizard.state.value.matchedPlace.name_i18n)
        }}</span>
        <span v-if="wizard.state.value.matchedPlace.city" class="step-lugar__matched-city">
          {{ wizard.state.value.matchedPlace.city.name }}
        </span>
        <span class="step-lugar__matched-badge">
          <UiIcon name="i-lucide-check-circle" size="xs" />
          {{ t('suggest.existing_place') }}
        </span>
      </div>
      <button class="step-lugar__matched-clear" @click="searchAgain">
        {{ t('suggest.not_this_place') }}
      </button>
    </div>

    <!-- ── Búsqueda en nuestra propia base (primaria) ───────────────────── -->
    <template v-else-if="!wizard.state.value.showNewPlaceForm">
      <UFormField :label="t('suggest.local_search_label')">
        <div class="step-lugar__search-wrap">
          <UiInput
            :model-value="localQuery"
            :placeholder="t('suggest.local_search_placeholder')"
            icon="i-lucide-search"
            @update:model-value="onLocalInput"
          />
          <div v-if="showLocalResults" class="step-lugar__results">
            <div v-if="localSearch.loading.value" class="step-lugar__results-loading">
              <UiIcon name="i-lucide-loader-2" size="sm" class="animate-spin" />
            </div>
            <button
              v-for="place in localSearch.results.value"
              :key="place.id"
              class="step-lugar__result-item"
              @click="selectMatchedPlace(place)"
            >
              <div class="step-lugar__result-img">
                <img v-if="place.thumbnail" :src="place.thumbnail" :alt="tc(place.name_i18n)" />
                <UiIcon v-else name="i-lucide-map-pin" size="sm" />
              </div>
              <div class="step-lugar__result-info">
                <span class="step-lugar__result-name">{{ tc(place.name_i18n) }}</span>
                <span v-if="place.city" class="step-lugar__result-addr">{{ place.city.name }}</span>
              </div>
            </button>
          </div>
        </div>
      </UFormField>

      <button class="step-lugar__manual-link" @click="wizard.toggleNewPlaceForm()">
        {{ t('suggest.cant_find_place') }} · {{ t('suggest.add_new_place') }}
      </button>
    </template>

    <!-- ── Proponer un lugar nuevo (Google search o manual) ─────────────── -->
    <template v-else>
      <button
        class="step-lugar__manual-link step-lugar__back-link"
        @click="wizard.toggleNewPlaceForm()"
      >
        <UiIcon name="i-lucide-arrow-left" size="xs" class="step-lugar__back-icon" />
        {{ t('suggest.back_to_local_search') }}
      </button>

      <template v-if="!wizard.state.value.isManual">
        <!-- Input visible solo si no hay lugar seleccionado -->
        <div v-if="!wizard.hasPlace.value" class="step-lugar__search">
          <UFormField :label="t('suggest.place_search')">
            <div class="step-lugar__search-wrap">
              <UiInput
                :model-value="query"
                :placeholder="t('suggest.place_search_placeholder')"
                icon="i-lucide-search"
                @update:model-value="onInput"
              />
              <!-- Resultados -->
              <div v-if="showResults" class="step-lugar__results">
                <div v-if="search.loading.value" class="step-lugar__results-loading">
                  <UiIcon name="i-lucide-loader-2" size="sm" class="animate-spin" />
                </div>
                <button
                  v-for="place in search.results.value"
                  :key="place.google_place_id"
                  class="step-lugar__result-item"
                  @click="selectPlace(place)"
                >
                  <div class="step-lugar__result-img">
                    <img v-if="place.photo_url" :src="place.photo_url" :alt="place.name" />
                    <UiIcon v-else name="i-lucide-map-pin" size="sm" />
                  </div>
                  <div class="step-lugar__result-info">
                    <span class="step-lugar__result-name">{{ place.name }}</span>
                    <span class="step-lugar__result-addr">{{ place.address }}</span>
                  </div>
                </button>
              </div>
            </div>
          </UFormField>

          <button class="step-lugar__manual-link" @click="toggleManual">
            {{ t('suggest.manual_entry') }}
          </button>
        </div>

        <!-- Lugar encontrado -->
        <template v-else>
          <!-- Descripción: preloaded from Google; hint if empty -->
          <div class="step-lugar__desc-field">
            <UFormField :label="t('suggest.description')">
              <UTextarea
                v-model="wizard.state.value.description"
                :placeholder="t('suggest.description_placeholder')"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <p v-if="!wizard.state.value.description.trim()" class="step-lugar__desc-hint">
              <UiIcon name="i-lucide-info" size="xs" />
              {{ t('suggest.description_hint') }}
            </p>
          </div>

          <!-- Ver más: phone, website, opening hours -->
          <template v-if="hasPlaceExtra">
            <button class="step-lugar__toggle-extra" @click="showPlaceExtra = !showPlaceExtra">
              <UiIcon
                :name="showPlaceExtra ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                size="xs"
              />
              {{ showPlaceExtra ? t('suggest.show_less') : t('suggest.show_more') }}
            </button>

            <div v-if="showPlaceExtra" class="step-lugar__extra-fields">
              <UFormField
                v-if="wizard.state.value.placeInfo.phone !== undefined"
                :label="t('suggest.phone')"
              >
                <UiInput v-model="wizard.state.value.placeInfo.phone" icon="i-lucide-phone" />
              </UFormField>

              <UFormField
                v-if="wizard.state.value.placeInfo.website !== undefined"
                :label="t('suggest.website')"
              >
                <UiInput v-model="wizard.state.value.placeInfo.website" icon="i-lucide-globe" />
              </UFormField>

              <UFormField
                v-if="wizard.state.value.placeInfo.openingHoursText"
                :label="t('suggest.opening_hours')"
              >
                <UTextarea
                  v-model="wizard.state.value.placeInfo.openingHoursText"
                  :rows="4"
                  class="w-full"
                />
              </UFormField>
            </div>
          </template>
        </template>
      </template>

      <!-- Entrada manual -->
      <template v-else>
        <div class="step-lugar__manual">
          <div class="step-lugar__row">
            <UFormField :label="t('suggest.name')" required>
              <UiInput
                v-model="wizard.state.value.manualName"
                :placeholder="t('suggest.name_placeholder')"
              />
            </UFormField>
            <UFormField :label="t('suggest.city')" required>
              <UiInput
                v-model="wizard.state.value.manualCity"
                :placeholder="t('suggest.city_placeholder')"
                @blur="triggerGeocode"
              />
            </UFormField>
          </div>

          <UFormField :label="t('suggest.address')">
            <UiInput
              v-model="wizard.state.value.manualAddress"
              :placeholder="t('suggest.address_placeholder')"
              @blur="triggerGeocode"
            />
          </UFormField>

          <!-- Geocoding feedback -->
          <div v-if="geoStatus !== 'idle'" class="step-lugar__geo-status">
            <template v-if="geoStatus === 'loading'">
              <UiIcon name="i-lucide-loader-2" size="xs" class="animate-spin" />
              <span>{{ t('suggest.geocoding') }}</span>
            </template>
            <template v-else-if="geoStatus === 'found'">
              <UiIcon name="i-lucide-map-pin" size="xs" class="step-lugar__geo-ok" />
            </template>
            <template v-else-if="geoStatus === 'not_found'">
              <UiIcon name="i-lucide-map-pin-off" size="xs" class="step-lugar__geo-warn" />
              <span class="step-lugar__geo-warn">{{ t('suggest.coords_not_found') }}</span>
            </template>
          </div>

          <UFormField :label="t('suggest.description')">
            <UTextarea
              v-model="wizard.state.value.description"
              :placeholder="t('suggest.description_placeholder')"
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <button class="step-lugar__manual-link" @click="toggleManual">
            {{ t('suggest.search_automatic') }}
          </button>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.step-lugar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.step-lugar__matched {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 0.5px solid var(--color-success-300, #86efac);
  background: var(--color-success-50, #f0fdf4);
  border-radius: var(--border-radius-lg);
}

.step-lugar__matched-photo {
  width: 44px;
  height: 44px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-background-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}

.step-lugar__matched-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.step-lugar__matched-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.step-lugar__matched-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.step-lugar__matched-city {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.step-lugar__matched-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-success-700, #15803d);
  margin-top: 2px;
}

.step-lugar__matched-clear {
  font-size: var(--font-size-xs);
  color: var(--color-secondary-600);
  text-decoration: underline;
  text-underline-offset: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  font-family: var(--font-family-base);
  align-self: flex-start;
}

.step-lugar__back-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.step-lugar__back-icon {
  transform: scaleX(var(--icon-flip, 1));
}

[dir='rtl'] .step-lugar__back-icon {
  --icon-flip: -1;
}

.step-lugar__search {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.step-lugar__search-wrap {
  position: relative;
  width: 100%;
}

.step-lugar__results {
  position: absolute;
  inset-block-start: calc(100% + 4px);
  inset-inline: 0;
  background-color: var(--color-background-primary);
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  z-index: 50;
}

.step-lugar__results-loading {
  display: flex;
  justify-content: center;
  padding: var(--space-3);
}

.step-lugar__result-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  width: 100%;
  text-align: start;
  background: transparent;
  border: none;
  border-bottom: 0.5px solid var(--color-border-tertiary);
  cursor: pointer;
  transition: background 0.15s;
}

.step-lugar__result-item:last-child {
  border-bottom: none;
}

.step-lugar__result-item:hover {
  background: var(--color-background-secondary);
}

.step-lugar__result-img {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  background: var(--color-background-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-lugar__result-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.step-lugar__result-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.step-lugar__result-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-lugar__result-addr {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-lugar__desc-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.step-lugar__desc-hint {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.step-lugar__toggle-extra {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-secondary-600);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: var(--font-family-base);
  text-decoration: underline;
  text-underline-offset: 2px;
  align-self: flex-start;
}

.step-lugar__toggle-extra:hover {
  color: var(--color-secondary-700);
}

.step-lugar__extra-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.step-lugar__manual-link {
  font-size: var(--font-size-xs);
  color: var(--color-secondary-500);
  text-decoration: underline;
  text-underline-offset: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: start;
}

.step-lugar__manual-link:hover {
  color: var(--color-secondary-600);
}

.step-lugar__manual {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.step-lugar__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.step-lugar__geo-status {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-block-start: calc(-1 * var(--space-2));
}

.step-lugar__geo-ok {
  color: var(--color-success-500, #22c55e);
}

.step-lugar__geo-warn {
  color: var(--color-warning-600, #d97706);
}
</style>
