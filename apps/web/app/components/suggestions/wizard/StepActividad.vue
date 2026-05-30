<script setup lang="ts">
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'
import type { WizardCategory } from '~/composables/useSuggestionWizard'
import { useCategories } from '~/composables/useCategories'
import { useI18nContent } from '~/composables/useI18nContent'

const wizard = useSuggestionWizard()
const { t } = useI18n()
const { tc } = useI18nContent()
const store = useActivitiesStore()
const { getNavCategoriesWithChildren } = useCategories()

// Subcategories (nav_level=2) from DB. Key shared with Body.vue — Nuxt deduplicates.
const { data: categoriesData } = useAsyncData('wizard-subcategories', () =>
  getNavCategoriesWithChildren()
)

const subcategories = computed<WizardCategory[]>(() =>
  (categoriesData.value ?? []).flatMap((parent) =>
    parent.children.map((c) => ({
      id: c.id,
      slug: c.slug,
      name_i18n: c.name_i18n as Record<string, string>,
    }))
  )
)

// Reconcile Google-suggested IDs against real DB subcats once they're available
const reconcileSuggestedCategories = () => {
  if (wizard.state.value.selectedCategories.length) return
  const suggested = wizard.state.value.placeResult?.suggested_categories ?? []
  const matched = suggested
    .map((sg) => subcategories.value.find((c) => c.id === sg.id))
    .filter((c): c is WizardCategory => c !== undefined)
    .slice(0, 1)
  if (matched.length) wizard.state.value.selectedCategories = matched
}

watch(
  subcategories,
  (subs) => {
    if (subs.length) reconcileSuggestedCategories()
  },
  {
    immediate: true,
  }
)

// Ensure filter options (ages + seasons) are loaded
onMounted(async () => {
  if (!store.filterOptionsLoaded) await store.loadFilterOptions()
})

// ── Age options (includes 'all') ──────────────────────────────────
const ageOptions = computed(() =>
  store.filterOptions.ageRanges
    .filter((a) => a.label_key.startsWith('age.'))
    .map((a) => ({
      id: a.id,
      label: t(`search.${a.label_key.replace('.', '_')}`),
      isAll: a.label_key === 'age.all',
    }))
)

// ID of the "all ages" row — needed to clear it when a specific age is picked
const allAgeId = computed(
  () => store.filterOptions.ageRanges.find((a) => a.label_key === 'age.all')?.id
)

// ── Season options (includes 'all') ──────────────────────────────
const seasonOptions = computed(() =>
  store.filterOptions.seasons.map((s) => ({
    value: s.value,
    label: t(s.label_key),
    isAll: s.value === 'all',
  }))
)

// ── Derived availability ──────────────────────────────────────────
const selectedCategory = computed(() => wizard.state.value.selectedCategories[0] ?? null)

const availableCategories = computed(() =>
  subcategories.value.filter((c) => c.id !== selectedCategory.value?.id)
)

const availableSeasons = computed(() =>
  seasonOptions.value.filter((s) => !wizard.state.value.selectedSeasons.includes(s.value))
)

const availableAges = computed(() =>
  ageOptions.value.filter((a) => !wizard.state.value.selectedAgeIds.includes(a.id))
)

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
          {{ tc(selectedCategory.name_i18n) }}
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
          {{ tc(cat.name_i18n) }}
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
        <div
          v-if="wizard.state.value.customActivity && !showCustomInput"
          class="step-actividad__custom-added"
        >
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
    <div
      v-if="selectedCategory || wizard.state.value.customActivity"
      class="step-actividad__section"
    >
      <span class="step-actividad__label">{{ t('suggest.season') }}</span>
      <div class="step-actividad__scroll-row">
        <button
          v-for="s in availableSeasons"
          :key="s.value"
          class="step-actividad__chip"
          @click="wizard.toggleSeason(s.value)"
        >
          {{ s.label }}
        </button>
      </div>
      <div v-if="!availableSeasons.length" class="step-actividad__all-selected">
        <UiIcon name="i-lucide-check" size="xs" />
        {{ t('suggest.all_seasons_selected') }}
      </div>
    </div>

    <!-- Edades -->
    <div
      v-if="selectedCategory || wizard.state.value.customActivity"
      class="step-actividad__section"
    >
      <span class="step-actividad__label">{{ t('suggest.ages') }}</span>
      <div class="step-actividad__scroll-row">
        <button
          v-for="a in availableAges"
          :key="a.id"
          class="step-actividad__chip"
          @click="wizard.toggleAge(a.id, a.label, a.isAll, allAgeId)"
        >
          {{ a.label }}
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
