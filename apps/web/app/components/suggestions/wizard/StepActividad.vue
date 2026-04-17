<script setup lang="ts">
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'
import type { WizardCategory } from '~/composables/useSuggestionWizard'

const wizard = useSuggestionWizard()
const { t }  = useI18n()

const ALL_CATEGORIES: WizardCategory[] = [
  { id: '3e9f033e-f594-488d-98bf-a809cbd91299', name: 'Naturaleza' },
  { id: '5364a238-ba30-4d4c-846d-91bb0fda0095', name: 'Parques' },
  { id: '30d7ea34-bcf8-4209-b418-cdede2e431e6', name: 'Agua y playas' },
  { id: '49ca0529-1130-43f7-a439-3198d7ac5b56', name: 'Camping' },
  { id: 'ec4b6619-dd04-4f06-b32f-480af759c30c', name: 'Picnic' },
  { id: '0f35ac9a-3c24-4224-ad35-0de0a7ff7035', name: 'Museos' },
  { id: '2027495d-0003-4308-b16b-586dfea6adbb', name: 'Arte' },
  { id: 'a95dbfb7-1324-48c6-9aa1-43952c21151a', name: 'Historia' },
  { id: 'a1287296-46a8-4973-b892-5dca978c06a7', name: 'Religioso' },
  { id: '82e97ad6-e5a9-46cb-a394-209b593d5526', name: 'Educativo' },
  { id: 'f5adf8e8-bb7b-4b12-af87-0789a401149c', name: 'Animales' },
  { id: '4de2060d-173a-4733-8bb4-10d25c1a622d', name: 'Juego y recreo' },
  { id: '6ea4f0c3-ac70-43bf-9161-7defc88a036d', name: 'Trekking' },
  { id: '3c9bd581-ea1b-4e96-b2f1-d45775425e46', name: 'Ski' },
  { id: 'fdbe1e25-ee11-484f-9177-99ffe978a8d5', name: 'Deportes' },
  { id: '05031276-9b35-4d51-b4d4-2da8de4e03fe', name: 'Gastronomía' },
]

const SEASONS = ['Primavera', 'Verano', 'Otoño', 'Invierno', 'Todo el año']

const AGE_RANGES = [
  { id: 6,  label: 'Bebés (0–11m)' },
  { id: 7,  label: 'Pequeños (1–3 años)' },
  { id: 8,  label: 'Preescolar (3–6 años)' },
  { id: 9,  label: 'Escolar (6–12 años)' },
  { id: 10, label: 'Adolescentes (12+)' },
  { id: 11, label: 'Todas las edades' },
]

// Categoría seleccionada — solo una
const selectedCategory = computed(() =>
  wizard.state.value.selectedCategories[0] ?? null
)

// Categorías disponibles — todas excepto la seleccionada
const availableCategories = computed(() =>
  ALL_CATEGORIES.filter(c => c.id !== selectedCategory.value?.id)
)

// Temporadas y edades no seleccionadas
const availableSeasons = computed(() =>
  SEASONS.filter(s => !wizard.state.value.selectedSeasons.includes(s))
)

const availableAges = computed(() =>
  AGE_RANGES.filter(a => !wizard.state.value.selectedAgeIds.includes(a.id))
)

// Selección simple de categoría — reemplaza la anterior
const selectCategory = (cat: WizardCategory) => {
  wizard.state.value.selectedCategories = [cat]
}

// Custom activity
const customActivity = ref('')
const showCustomInput = ref(false)

const addCustomActivity = () => {
  if (!customActivity.value.trim()) return
  wizard.state.value.customActivity = customActivity.value.trim()
  customActivity.value = ''
  showCustomInput.value = false
}
</script>

<template>
  <div class="step-actividad">

    <!-- Actividad principal -->
    <div class="step-actividad__section">
      <span class="step-actividad__label">{{ t('suggest.what_to_do') }}</span>

      <!-- Categoría seleccionada -->
      <div v-if="selectedCategory" class="step-actividad__selected-cat">
        <span class="step-actividad__cat-badge">
          {{ selectedCategory.name }}
        </span>
        <span class="step-actividad__cat-hint">{{ t('suggest.change_activity') }}</span>
      </div>

      <!-- Chips disponibles — siempre visibles para cambiar -->
      <div class="step-actividad__scroll-row">
        <button
          v-for="cat in availableCategories"
          :key="cat.id"
          class="step-actividad__chip"
          @click="selectCategory(cat)"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- No encuentro la actividad -->
      <div class="step-actividad__custom">
        <button
          v-if="!showCustomInput && !wizard.state.value.customActivity"
          class="step-actividad__custom-link"
          @click="showCustomInput = true"
        >
          {{ t('suggest.activity_not_found') }}
        </button>

        <!-- Input custom -->
        <div v-if="showCustomInput" class="step-actividad__custom-input">
          <UiInput
            v-model="customActivity"
            :placeholder="t('suggest.activity_custom_placeholder')"
            @keyup.enter="addCustomActivity"
          />
          <UiButton variant="primary" size="sm" @click="addCustomActivity">
            {{ t('suggest.activity_add') }}
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="showCustomInput = false">
            {{ t('common.cancel') }}
          </UiButton>
        </div>

        <!-- Custom agregado -->
        <div v-if="wizard.state.value.customActivity && !showCustomInput" class="step-actividad__custom-added">
          <span class="step-actividad__cat-badge step-actividad__cat-badge--custom">
            {{ wizard.state.value.customActivity }}
          </span>
          <button
            class="step-actividad__custom-remove"
            @click="wizard.state.value.customActivity = ''"
          >
            <UiIcon name="i-lucide-x" size="xs" />
          </button>
        </div>
      </div>
    </div>

    <!-- Temporada -->
    <div v-if="selectedCategory || wizard.state.value.customActivity" class="step-actividad__section">
      <span class="step-actividad__label">{{ t('suggest.season') }}</span>
      <div class="step-actividad__scroll-row">
        <button
          v-for="season in availableSeasons"
          :key="season"
          class="step-actividad__chip"
          @click="wizard.toggleSeason(season)"
        >
          {{ season }}
        </button>
      </div>
      <div v-if="!availableSeasons.length" class="step-actividad__all-selected">
        <UiIcon name="i-lucide-check" size="xs" />
        {{ t('suggest.all_seasons_selected') }}
      </div>
    </div>

    <!-- Edades -->
    <div v-if="selectedCategory || wizard.state.value.customActivity" class="step-actividad__section">
      <span class="step-actividad__label">{{ t('suggest.ages') }}</span>
      <div class="step-actividad__scroll-row">
        <button
          v-for="age in availableAges"
          :key="age.id"
          class="step-actividad__chip"
          @click="wizard.toggleAge(age.id, age.label)"
        >
          {{ age.label }}
        </button>
      </div>
      <div v-if="!availableAges.length" class="step-actividad__all-selected">
        <UiIcon name="i-lucide-check" size="xs" />
        {{ t('suggest.all_ages_selected') }}
      </div>
    </div>

  </div>
</template>

<style scoped>
.step-actividad {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.step-actividad__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.step-actividad__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.step-actividad__selected-cat {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.step-actividad__cat-badge {
  display: inline-flex;
  align-items: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  padding: var(--space-1) var(--space-3);
  border-radius: 99px;
  background: var(--color-secondary-100);
  border: 0.5px solid var(--color-secondary-400);
  color: var(--color-secondary-800);
}

.step-actividad__cat-badge--custom {
  background: var(--color-primary-50);
  border-color: var(--color-primary-300);
  color: var(--color-primary-700);
}

.step-actividad__cat-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.step-actividad__scroll-row {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-1);
  scrollbar-width: none;
  flex-wrap: wrap;
}

.step-actividad__scroll-row::-webkit-scrollbar {
  display: none;
}

.step-actividad__chip {
  display: inline-flex;
  align-items: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  padding: var(--space-1) var(--space-3);
  border-radius: 99px;
  border: 0.5px solid var(--color-secondary-300);
  background: var(--color-secondary-50);
  color: var(--color-secondary-700);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  font-family: var(--font-family-base);
  flex-shrink: 0;
}

.step-actividad__chip:hover {
  background: var(--color-secondary-100);
  border-color: var(--color-secondary-400);
}

.step-actividad__custom {
  margin-top: var(--space-1);
}

.step-actividad__custom-link {
  font-size: var(--font-size-xs);
  color: var(--color-secondary-600);
  text-decoration: underline;
  text-underline-offset: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: var(--font-family-base);
}

.step-actividad__custom-link:hover {
  color: var(--color-secondary-700);
}

.step-actividad__custom-input {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}

.step-actividad__custom-added {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.step-actividad__custom-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  padding: 0;
}

.step-actividad__custom-remove:hover {
  color: var(--color-text-primary);
}

.step-actividad__all-selected {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-secondary-600);
}
</style>