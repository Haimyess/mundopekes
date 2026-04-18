<script setup lang="ts">
import { usePlacesSearch } from '~/composables/usePlacesSearch'
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'

const wizard  = useSuggestionWizard()
const search  = usePlacesSearch()
const { t }   = useI18n()

const query      = ref('')
const showResults = computed(() => search.results.value.length > 0 && !wizard.hasPlace.value)

const onInput = (val: string) => {
  query.value = val
  if (!wizard.state.value.isManual) search.search(val)
}

const selectPlace = (place: typeof search.results.value[0]) => {
  wizard.setPlace(place)
  search.clear()
  query.value = place.name
}

const clearPlace = () => {
  wizard.clearPlace()
  query.value = ''
  search.clear()
}

const toggleManual = () => {
  wizard.state.value.isManual = !wizard.state.value.isManual
  if (wizard.state.value.isManual) {
    search.clear()
    query.value = ''
    wizard.clearPlace()
  }
}
</script>

<template>
  <div class="step-lugar">

    <!-- Búsqueda automática -->
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
              <div
                v-if="search.loading.value"
                class="step-lugar__results-loading"
              >
                <UiIcon name="i-lucide-loader-2" size="sm" class="animate-spin" />
              </div>
              <button
                v-for="place in search.results.value"
                :key="place.google_place_id"
                class="step-lugar__result-item"
                @click="selectPlace(place)"
              >
                <div class="step-lugar__result-img">
                  <img
                    v-if="place.photo_url"
                    :src="place.photo_url"
                    :alt="place.name"
                  >
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

      <!-- Lugar encontrado: solo descripción -->
      <div v-else class="step-lugar__desc-field">
        <UFormField :label="t('suggest.description')">
          <UTextarea
            v-model="wizard.state.value.description"
            :placeholder="t('suggest.description_placeholder')"
            :rows="4"
            class="w-full"
          />
        </UFormField>
      </div>

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
            />
          </UFormField>
        </div>
        <UFormField :label="t('suggest.address')">
          <UiInput
            v-model="wizard.state.value.manualAddress"
            :placeholder="t('suggest.address_placeholder')"
          />
        </UFormField>
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

  </div>
</template>

<style scoped>
.step-lugar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
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
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  /* background: var(--color-background-primary); */
  background-color: white;
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
  text-align: left;
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

.step-lugar__manual-link {
  font-size: var(--font-size-xs);
  color: var(--color-secondary-500);
  text-decoration: underline;
  text-underline-offset: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: left;
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

.step-lugar__desc-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>