<script setup lang="ts">
import { useSuggestionWizard, defaultActivityDraft } from '~/composables/useSuggestionWizard'
import type { WizardCategory, ActivityDraftNew } from '~/composables/useSuggestionWizard'
import { useCategories } from '~/composables/useCategories'
import { useLocalActivitySearch } from '~/composables/useLocalActivitySearch'
import type { LocalActivityMatch } from '~/composables/useLocalActivitySearch'
import { useI18nContent } from '~/composables/useI18nContent'

const wizard = useSuggestionWizard()
const { t } = useI18n()
const { tc } = useI18nContent()
const store = useActivitiesStore()
const { getNavCategoriesWithChildren } = useCategories()

// Subcategories (nav_level=2) from DB. Key shared with (deleted) old usage —
// Nuxt dedupes on this key across the app.
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

onMounted(async () => {
  if (!store.filterOptionsLoaded) await store.loadFilterOptions()
})

// ── Existing-activity search (only meaningful when the place already exists) ──
const matchedPlaceId = computed(() => wizard.state.value.matchedPlace?.id ?? '')
const activitySearch = useLocalActivitySearch(matchedPlaceId.value)
const activityQuery = ref('')
const showActivityResults = computed(() => activitySearch.results.value.length > 0)

const onActivityInput = (val: string) => {
  activityQuery.value = val
  activitySearch.search(val)
}

const selectExistingActivity = (match: LocalActivityMatch) => {
  wizard.addExistingActivity(match)
  activitySearch.clear()
  activityQuery.value = ''
}

// ── Add/edit form ────────────────────────────────────────────────────
const editingLocalId = ref<string | null>(null)
const draft = ref<ActivityDraftNew>(defaultActivityDraft())
// Form starts open when nothing has been added yet (the common "just one
// activity" case asks for its fields immediately); closed once at least one
// card exists, behind an "add another" button.
const showForm = ref(wizard.state.value.activities.length === 0)

// Pre-fill the very first draft's category from Google's suggested type, once
// real DB subcategories are loaded.
watch(
  subcategories,
  (subs) => {
    if (!subs.length) return
    if (wizard.state.value.activities.length > 0) return
    if (draft.value.category) return
    const suggested = wizard.state.value.placeResult?.suggested_categories ?? []
    const matched = suggested.map((sg) => subs.find((c) => c.id === sg.id)).find(Boolean)
    if (matched) draft.value.category = matched
  },
  { immediate: true }
)

const ageOptions = computed(() =>
  store.filterOptions.ageRanges
    .filter((a) => a.label_key.startsWith('age.'))
    .map((a) => ({
      id: a.id,
      label: t(`search.${a.label_key.replace('.', '_')}`),
      isAll: a.label_key === 'age.all',
    }))
)

const allAgeId = computed(
  () => store.filterOptions.ageRanges.find((a) => a.label_key === 'age.all')?.id
)

const seasonOptions = computed(() =>
  store.filterOptions.seasons.map((s) => ({
    value: s.value,
    label: t(s.label_key),
    isAll: s.value === 'all',
  }))
)

const availableCategories = computed(() =>
  subcategories.value.filter((c) => c.id !== draft.value.category?.id)
)
const availableSeasons = computed(() =>
  seasonOptions.value.filter((s) => !draft.value.selectedSeasons.includes(s.value))
)
const availableAges = computed(() =>
  ageOptions.value.filter((a) => !draft.value.selectedAgeIds.includes(a.id))
)

const selectCategory = (cat: WizardCategory) => {
  draft.value.category = cat
}

const toggleSeason = (value: string) => {
  if (value === 'all') {
    draft.value.selectedSeasons = ['all']
    return
  }
  const allIdx = draft.value.selectedSeasons.indexOf('all')
  if (allIdx !== -1) draft.value.selectedSeasons.splice(allIdx, 1)
  const idx = draft.value.selectedSeasons.indexOf(value)
  if (idx === -1) draft.value.selectedSeasons.push(value)
  else draft.value.selectedSeasons.splice(idx, 1)
}

const toggleAge = (id: number, label: string, isAll = false) => {
  if (isAll) {
    draft.value.selectedAgeIds = [id]
    draft.value.selectedAgeLabels = [label]
    return
  }
  const allIdx =
    allAgeId.value !== undefined ? draft.value.selectedAgeIds.indexOf(allAgeId.value) : -1
  if (allIdx !== -1) {
    draft.value.selectedAgeIds.splice(allIdx, 1)
    draft.value.selectedAgeLabels.splice(allIdx, 1)
  }
  const idx = draft.value.selectedAgeIds.indexOf(id)
  if (idx === -1) {
    draft.value.selectedAgeIds.push(id)
    draft.value.selectedAgeLabels.push(label)
  } else {
    draft.value.selectedAgeIds.splice(idx, 1)
    draft.value.selectedAgeLabels.splice(idx, 1)
  }
}

const customActivityInput = ref('')
const showCustomInput = ref(false)
const addCustomActivity = () => {
  if (!customActivityInput.value.trim()) return
  draft.value.customActivity = customActivityInput.value.trim()
  customActivityInput.value = ''
  showCustomInput.value = false
}

const canSaveDraft = computed(() => !!draft.value.category || !!draft.value.customActivity)

const saveDraft = () => {
  if (!canSaveDraft.value) return
  if (editingLocalId.value) {
    wizard.updateActivityDraft(editingLocalId.value, { ...draft.value })
  } else {
    wizard.addActivityDraft(draft.value)
  }
  editingLocalId.value = null
  draft.value = defaultActivityDraft()
  showForm.value = false
}

const cancelForm = () => {
  editingLocalId.value = null
  draft.value = defaultActivityDraft()
  showForm.value = false
}

const openAddForm = () => {
  editingLocalId.value = null
  draft.value = defaultActivityDraft()
  showForm.value = true
}

const editCard = (a: ActivityDraftNew) => {
  editingLocalId.value = a.localId
  draft.value = { ...a }
  showForm.value = true
}

const removeCard = (localId: string) => {
  wizard.removeActivityDraft(localId)
  if (editingLocalId.value === localId) cancelForm()
}

const cardLabel = (a: (typeof wizard.state.value.activities)[number]) =>
  a.mode === 'existing' ? a.title : wizard.effectiveDraftTitle(a) || t('suggest.activity_untitled')

// ── Schedule / details fields for the form in progress ────────────────
const DAYS = computed(() => [
  { key: 'sunday' as const, label: t('common.day_sunday') },
  { key: 'monday' as const, label: t('common.day_monday') },
  { key: 'tuesday' as const, label: t('common.day_tuesday') },
  { key: 'wednesday' as const, label: t('common.day_wednesday') },
  { key: 'thursday' as const, label: t('common.day_thursday') },
  { key: 'friday' as const, label: t('common.day_friday') },
  { key: 'saturday' as const, label: t('common.day_saturday') },
])

const TOGGLES = computed(() => [
  { key: 'stroller' as const, label: t('suggest.toggle_stroller'), icon: 'i-lucide-baby' },
  { key: 'shadow' as const, label: t('suggest.toggle_shadow'), icon: 'i-lucide-tree-pine' },
  { key: 'bathrooms' as const, label: t('suggest.toggle_bathrooms'), icon: 'i-lucide-toilet' },
  { key: 'weekends' as const, label: t('suggest.toggle_weekends'), icon: 'i-lucide-calendar' },
])

const googleHoursLines = computed(() => {
  const text = wizard.state.value.placeInfo?.openingHoursText ?? ''
  return text ? text.split('\n').filter(Boolean) : []
})
const hasGoogleHours = computed(() => googleHoursLines.value.length > 0)
const showManualEditor = ref(false)
</script>

<template>
  <div class="step-actividad">
    <!-- ── Actividades ya agregadas ──────────────────────────────────── -->
    <div v-if="wizard.state.value.activities.length" class="step-actividad__cards">
      <div v-for="a in wizard.state.value.activities" :key="a.localId" class="step-actividad__card">
        <div class="step-actividad__card-info">
          <span class="step-actividad__card-title">{{ cardLabel(a) }}</span>
          <span
            class="step-actividad__card-tag"
            :class="{ 'step-actividad__card-tag--existing': a.mode === 'existing' }"
          >
            <UiIcon
              :name="a.mode === 'existing' ? 'i-lucide-check-circle' : 'i-lucide-sparkles'"
              size="xs"
            />
            {{ a.mode === 'existing' ? t('suggest.existing_activity') : t('suggest.new_activity') }}
          </span>
        </div>
        <div class="step-actividad__card-actions">
          <button v-if="a.mode === 'new'" class="step-actividad__card-btn" @click="editCard(a)">
            <UiIcon name="i-lucide-pencil" size="xs" />
          </button>
          <button class="step-actividad__card-btn" @click="removeCard(a.localId)">
            <UiIcon name="i-lucide-x" size="xs" />
          </button>
        </div>
      </div>
    </div>

    <!-- ── Buscar actividad existente (sólo si el lugar ya existe) ─────── -->
    <div v-if="wizard.state.value.matchedPlace && !showForm" class="step-actividad__search-wrap">
      <UFormField :label="t('suggest.activity_search_label')">
        <UiInput
          :model-value="activityQuery"
          :placeholder="t('suggest.activity_search_placeholder')"
          icon="i-lucide-search"
          @update:model-value="onActivityInput"
        />
      </UFormField>
      <div v-if="showActivityResults" class="step-actividad__results">
        <button
          v-for="match in activitySearch.results.value"
          :key="match.id"
          class="step-actividad__result-item"
          @click="selectExistingActivity(match)"
        >
          {{ Object.values(match.title_i18n).find((v) => v) }}
        </button>
      </div>
    </div>

    <!-- ── Botón agregar otra actividad ─────────────────────────────── -->
    <button v-if="!showForm" class="step-actividad__add-btn" @click="openAddForm">
      <UiIcon name="i-lucide-plus" size="sm" />
      {{
        wizard.state.value.activities.length
          ? t('suggest.add_another_activity')
          : t('suggest.activity_not_found')
      }}
    </button>

    <!-- ── Formulario de actividad (nueva o edición) ────────────────────── -->
    <div v-if="showForm" class="step-actividad__form">
      <!-- Categoría -->
      <div class="step-actividad__section">
        <span class="step-actividad__label">{{ t('suggest.what_to_do') }}</span>

        <div v-if="draft.category" class="step-actividad__selected-cat">
          <span class="step-actividad__cat-badge">{{ tc(draft.category.name_i18n) }}</span>
          <span class="step-actividad__cat-hint">{{ t('suggest.change_activity') }}</span>
        </div>

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

        <div class="step-actividad__custom">
          <button
            v-if="!showCustomInput && !draft.customActivity"
            class="step-actividad__custom-link"
            @click="showCustomInput = true"
          >
            {{ t('suggest.activity_not_found') }}
          </button>

          <div v-if="showCustomInput" class="step-actividad__custom-input">
            <UiInput
              v-model="customActivityInput"
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

          <div v-if="draft.customActivity && !showCustomInput" class="step-actividad__custom-added">
            <span class="step-actividad__cat-badge step-actividad__cat-badge--custom">
              {{ draft.customActivity }}
            </span>
            <button class="step-actividad__custom-remove" @click="draft.customActivity = ''">
              <UiIcon name="i-lucide-x" size="xs" />
            </button>
          </div>
        </div>
      </div>

      <!-- Temporada -->
      <div v-if="canSaveDraft" class="step-actividad__section">
        <span class="step-actividad__label">{{ t('suggest.season') }}</span>
        <div class="step-actividad__scroll-row">
          <button
            v-for="s in availableSeasons"
            :key="s.value"
            class="step-actividad__chip"
            @click="toggleSeason(s.value)"
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
      <div v-if="canSaveDraft" class="step-actividad__section">
        <span class="step-actividad__label">{{ t('suggest.ages') }}</span>
        <div class="step-actividad__scroll-row">
          <button
            v-for="a in availableAges"
            :key="a.id"
            class="step-actividad__chip"
            @click="toggleAge(a.id, a.label, a.isAll)"
          >
            {{ a.label }}
          </button>
        </div>
        <div v-if="!availableAges.length" class="step-actividad__all-selected">
          <UiIcon name="i-lucide-check" size="xs" />
          {{ t('suggest.all_ages_selected') }}
        </div>
      </div>

      <!-- Precio -->
      <div class="step-actividad__section">
        <div class="step-actividad__toggle-row">
          <div class="step-actividad__toggle-info">
            <UiIcon name="i-lucide-ticket" size="sm" />
            <span class="step-actividad__toggle-label">{{ t('suggest.free') }}</span>
          </div>
          <UCheckbox v-model="draft.isFree" />
        </div>
        <Transition name="slide-down">
          <div v-if="!draft.isFree" class="step-actividad__price">
            <UFormField :label="t('suggest.price')">
              <UiInput
                v-model="draft.price"
                type="number"
                placeholder="45"
                icon="i-lucide-shekel-sign"
              />
            </UFormField>
          </div>
        </Transition>
      </div>

      <!-- Características -->
      <div class="step-actividad__section">
        <div v-for="toggle in TOGGLES" :key="toggle.key" class="step-actividad__toggle-row">
          <div class="step-actividad__toggle-info">
            <UiIcon :name="toggle.icon" size="sm" />
            <span class="step-actividad__toggle-label">{{ toggle.label }}</span>
          </div>
          <UCheckbox v-model="draft[toggle.key]" />
        </div>
      </div>

      <!-- Horarios -->
      <div class="step-actividad__section">
        <div class="step-actividad__schedule-header">
          <span class="step-actividad__label">{{ t('suggest.schedule') }}</span>
          <div class="step-actividad__toggle-info step-actividad__toggle-info--inline">
            <span class="step-actividad__toggle-label step-actividad__toggle-label--sm">
              {{ t('suggest.hours_unknown') }}
            </span>
            <UCheckbox v-model="draft.hoursUnknown" />
          </div>
        </div>

        <template v-if="!draft.hoursUnknown">
          <template v-if="hasGoogleHours && !showManualEditor">
            <div class="step-actividad__google-hours">
              <p
                v-for="(line, i) in googleHoursLines"
                :key="i"
                class="step-actividad__google-hours-line"
              >
                {{ line }}
              </p>
            </div>
            <button class="step-actividad__manual-link" @click="showManualEditor = true">
              {{ t('suggest.edit_hours_manually') }}
            </button>
          </template>

          <template v-else>
            <div v-if="hasGoogleHours" class="step-actividad__manual-back">
              <button class="step-actividad__manual-link" @click="showManualEditor = false">
                <UiIcon name="i-lucide-arrow-left" size="xs" class="step-actividad__back-icon" />
                {{ t('suggest.opening_hours') }}
              </button>
            </div>
            <div class="step-actividad__schedule">
              <div v-for="day in DAYS" :key="day.key" class="step-actividad__day">
                <button
                  class="step-actividad__day-dot"
                  :class="{ 'step-actividad__day-dot--active': draft.schedule[day.key].open }"
                  @click="wizard.toggleDay(draft, day.key)"
                />
                <span
                  class="step-actividad__day-name"
                  :class="{ 'step-actividad__day-name--active': draft.schedule[day.key].open }"
                >
                  {{ day.label }}
                </span>
                <input
                  v-model="draft.schedule[day.key].start"
                  type="time"
                  class="step-actividad__time-input"
                  :disabled="!draft.schedule[day.key].open"
                />
                <span class="step-actividad__time-sep">–</span>
                <input
                  v-model="draft.schedule[day.key].end"
                  type="time"
                  class="step-actividad__time-input"
                  :disabled="!draft.schedule[day.key].open"
                />
              </div>
            </div>
          </template>
        </template>
      </div>

      <!-- Guardar / cancelar -->
      <div class="step-actividad__form-footer">
        <UiButton
          v-if="wizard.state.value.activities.length || editingLocalId"
          variant="ghost"
          size="sm"
          @click="cancelForm"
        >
          {{ t('common.cancel') }}
        </UiButton>
        <UiButton variant="primary" size="sm" :disabled="!canSaveDraft" @click="saveDraft">
          {{ editingLocalId ? t('common.save') : t('suggest.save_activity') }}
        </UiButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-actividad {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.step-actividad__cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.step-actividad__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-lg);
  background: var(--color-background-secondary);
}

.step-actividad__card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.step-actividad__card-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-actividad__card-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-primary-700, #1d4ed8);
  width: fit-content;
}

.step-actividad__card-tag--existing {
  color: var(--color-success-700, #15803d);
}

.step-actividad__card-actions {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}

.step-actividad__card-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.step-actividad__card-btn:hover {
  background: var(--color-background-tertiary);
}

.step-actividad__search-wrap {
  position: relative;
}

.step-actividad__results {
  position: absolute;
  inset-block-start: calc(100% + 4px);
  inset-inline: 0;
  background-color: var(--color-background-primary);
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  z-index: 50;
}

.step-actividad__result-item {
  display: block;
  width: 100%;
  text-align: start;
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  background: transparent;
  border: none;
  border-bottom: 0.5px solid var(--color-border-tertiary);
  cursor: pointer;
  font-family: var(--font-family-base);
}

.step-actividad__result-item:last-child {
  border-bottom: none;
}

.step-actividad__result-item:hover {
  background: var(--color-background-secondary);
}

.step-actividad__add-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  align-self: flex-start;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-secondary-600);
  background: var(--color-secondary-50);
  border: 0.5px dashed var(--color-secondary-300);
  border-radius: var(--border-radius-lg);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  font-family: var(--font-family-base);
}

.step-actividad__add-btn:hover {
  background: var(--color-secondary-100);
}

.step-actividad__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding-top: var(--space-2);
  border-top: 0.5px solid var(--color-border-tertiary);
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

.step-actividad__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 0.5px solid var(--color-border-tertiary);
}

.step-actividad__toggle-row:last-child {
  border-bottom: none;
}

.step-actividad__toggle-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
}

.step-actividad__toggle-info--inline {
  gap: var(--space-2);
}

.step-actividad__toggle-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.step-actividad__toggle-label--sm {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.step-actividad__price {
  padding-top: var(--space-2);
}

.step-actividad__schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.step-actividad__google-hours {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-background-secondary);
  border-radius: var(--border-radius-md);
  border: 0.5px solid var(--color-border-tertiary);
}

.step-actividad__google-hours-line {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
}

.step-actividad__manual-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-secondary-600);
  text-decoration: underline;
  text-underline-offset: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: var(--font-family-base);
  align-self: flex-start;
  margin-top: var(--space-1);
}

.step-actividad__back-icon {
  /* Logical icon, not a hardcoded glyph — flips automatically in RTL locales
     because the icon set + dir attribute are handled by the design system. */
  transform: scaleX(var(--icon-flip, 1));
}

[dir='rtl'] .step-actividad__back-icon {
  --icon-flip: -1;
}

.step-actividad__manual-link:hover {
  color: var(--color-secondary-700);
}

.step-actividad__manual-back {
  margin-bottom: var(--space-2);
}

.step-actividad__schedule {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.step-actividad__day {
  display: grid;
  grid-template-columns: 16px 80px 1fr auto 1fr;
  align-items: center;
  gap: var(--space-2);
}

.step-actividad__day-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border-secondary);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
  flex-shrink: 0;
}

.step-actividad__day-dot--active {
  background: var(--color-secondary-500);
  border-color: var(--color-secondary-500);
}

.step-actividad__day-name {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-medium);
  transition: color 0.15s;
}

.step-actividad__day-name--active {
  color: var(--color-text-primary);
}

.step-actividad__time-input {
  padding: 4px 6px;
  font-size: var(--font-size-xs);
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  outline: none;
  font-family: var(--font-sans);
  transition: all 0.15s;
  width: 100%;
}

.step-actividad__time-input:focus {
  border-color: var(--color-secondary-400);
}

.step-actividad__time-input:disabled {
  opacity: 0.35;
}

.step-actividad__time-sep {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-align: center;
}

.step-actividad__form-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  max-height: 80px;
}
</style>
