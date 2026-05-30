<script setup lang="ts">
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'
import type { WizardCategory } from '~/composables/useSuggestionWizard'
import { useCategories } from '~/composables/useCategories'
import { useI18nContent } from '~/composables/useI18nContent'

defineProps<{
  currentStep: number
  editOpen: boolean
  submitting: boolean
  canContinue: boolean
  isMobile: boolean
}>()

const emit = defineEmits<{
  next: []
  prev: []
  toggleEdit: []
}>()

const wizard = useSuggestionWizard()
const { t } = useI18n()
const { tc } = useI18nContent()
const store = useActivitiesStore()
const { getNavCategoriesWithChildren } = useCategories()

// Shared key with StepActividad — Nuxt returns cached data after first fetch
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

// ── Helpers ───────────────────────────────────────────────────────
const ageLabel = (labelKey: string) => t(`search.${labelKey.replace('.', '_')}`)

const allAgeId = computed(
  () => store.filterOptions.ageRanges.find((a) => a.label_key === 'age.all')?.id
)

// value → translated label, for displaying selected season values as text
const seasonLabelMap = computed(() =>
  Object.fromEntries(store.filterOptions.seasons.map((s) => [s.value, t(s.label_key)]))
)

// ── Edit drawer: available items ──────────────────────────────────
const availableDraftCategories = computed(() =>
  subcategories.value.filter(
    (c) => !wizard.editDraft.value?.selectedCategories?.some((s) => s.id === c.id)
  )
)

const availableDraftSeasons = computed(() =>
  store.filterOptions.seasons.filter(
    (s) => !wizard.editDraft.value?.selectedSeasons?.includes(s.value)
  )
)

const availableDraftAges = computed(() =>
  store.filterOptions.ageRanges
    .filter((a) => a.label_key.startsWith('age.'))
    .filter((a) => !wizard.editDraft.value?.selectedAgeIds?.includes(a.id))
)

const editIsEmpty = computed(
  () =>
    !wizard.editDraft.value?.selectedCategories?.length &&
    !wizard.editDraft.value?.customActivity &&
    !wizard.editDraft.value?.selectedSeasons?.length &&
    !wizard.editDraft.value?.selectedAgeLabels?.length
)
</script>

<template>
  <div class="wizard-body">
    <div class="wizard-body__sticky">
      <SuggestionsWizardResumenBar
        :current-step="currentStep"
        :on-edit="() => emit('toggleEdit')"
      />
    </div>

    <div class="wizard-body__content">
      <Transition name="step-fade" mode="out-in">
        <SuggestionsWizardStepLugar v-if="currentStep === 1" key="1" />
        <SuggestionsWizardStepActividad v-else-if="currentStep === 2" key="2" />
        <SuggestionsWizardStepDetalles v-else-if="currentStep === 3" key="3" />
      </Transition>
    </div>

    <div class="wizard-body__footer">
      <UiButton v-if="currentStep > 1" variant="ghost" size="sm" @click="emit('prev')">
        {{ t('common.back') }}
      </UiButton>
      <div style="flex: 1" />
      <UiButton
        variant="primary"
        size="sm"
        :loading="submitting"
        :disabled="!canContinue"
        @click="emit('next')"
      >
        {{ currentStep === 4 ? t('suggest.submit') : t('common.continue') }}
      </UiButton>
    </div>
  </div>

  <!-- Mobile: Drawer desde abajo -->
  <UiDrawer
    v-if="isMobile"
    :open="editOpen"
    direction="bottom"
    max-height="75vh"
    @update:open="
      (v) => {
        if (!v) wizard.closeEdit()
      }
    "
  >
    <template #body>
      <div class="edit-drawer">
        <div class="edit-drawer__header">
          <span class="edit-drawer__title">{{ t('suggest.edit_title') }}</span>
          <button class="edit-drawer__close" @click="wizard.closeEdit()">
            <UiIcon name="i-lucide-x" size="sm" />
          </button>
        </div>

        <div class="edit-drawer__content">
          <div v-if="!editIsEmpty" class="edit-sections">
            <div class="edit-section">
              <span class="edit-label">{{ t('suggest.activity_type') }}</span>
              <div class="edit-chips">
                <button
                  v-for="cat in wizard.editDraft.value?.selectedCategories"
                  :key="cat.id"
                  class="edit-chip edit-chip--active"
                  @click="wizard.draftToggleCategory(cat)"
                >
                  {{ tc(cat.name_i18n) }}
                  <UiIcon name="i-lucide-x" size="xs" />
                </button>
                <button
                  v-for="cat in availableDraftCategories"
                  :key="cat.id"
                  class="edit-chip"
                  @click="wizard.draftSetCategory(cat)"
                >
                  {{ tc(cat.name_i18n) }}
                  <UiIcon name="i-lucide-plus" size="xs" />
                </button>
              </div>
            </div>

            <div v-if="wizard.editDraft.value?.customActivity" class="edit-section">
              <span class="edit-label">{{ t('suggest.custom_activity') }}</span>
              <div class="edit-chips">
                <button
                  class="edit-chip edit-chip--active"
                  @click="wizard.draftClearCustomActivity()"
                >
                  {{ wizard.editDraft.value?.customActivity }}
                  <UiIcon name="i-lucide-x" size="xs" />
                </button>
              </div>
            </div>

            <div class="edit-section">
              <span class="edit-label">{{ t('suggest.season') }}</span>
              <div class="edit-chips">
                <button
                  v-for="sv in wizard.editDraft.value?.selectedSeasons"
                  :key="sv"
                  class="edit-chip edit-chip--active"
                  @click="wizard.draftToggleSeason(sv)"
                >
                  {{ seasonLabelMap[sv] ?? sv }}
                  <UiIcon name="i-lucide-x" size="xs" />
                </button>
                <button
                  v-for="s in availableDraftSeasons"
                  :key="s.value"
                  class="edit-chip"
                  @click="wizard.draftToggleSeason(s.value)"
                >
                  {{ t(s.label_key) }}
                  <UiIcon name="i-lucide-plus" size="xs" />
                </button>
              </div>
            </div>

            <div class="edit-section">
              <span class="edit-label">{{ t('suggest.ages') }}</span>
              <div class="edit-chips">
                <button
                  v-for="(label, i) in wizard.editDraft.value?.selectedAgeLabels"
                  :key="label"
                  class="edit-chip edit-chip--active"
                  @click="wizard.draftToggleAge(wizard.editDraft.value!.selectedAgeIds![i]!, label)"
                >
                  {{ label }}
                  <UiIcon name="i-lucide-x" size="xs" />
                </button>
                <button
                  v-for="age in availableDraftAges"
                  :key="age.id"
                  class="edit-chip"
                  @click="
                    wizard.draftToggleAge(
                      age.id,
                      ageLabel(age.label_key),
                      age.label_key === 'age.all',
                      allAgeId
                    )
                  "
                >
                  {{ ageLabel(age.label_key) }}
                  <UiIcon name="i-lucide-plus" size="xs" />
                </button>
              </div>
            </div>
          </div>
          <div v-else class="edit-empty">
            <UiIcon name="i-lucide-info" size="sm" />
            <span>{{ t('suggest.edit_empty') }}</span>
          </div>
        </div>

        <div class="edit-drawer__footer">
          <UiButton variant="primary" block @click="wizard.confirmEdit()">
            {{ t('common.done') }}
          </UiButton>
        </div>
      </div>
    </template>
  </UiDrawer>

  <!-- Desktop: Slideover lateral -->
  <USlideover
    v-else
    :open="editOpen"
    :title="t('suggest.edit_title')"
    @update:open="
      (v) => {
        if (!v) wizard.closeEdit()
      }
    "
  >
    <template #body>
      <div class="edit-slideover">
        <div v-if="!editIsEmpty" class="edit-sections">
          <div class="edit-section">
            <span class="edit-label">{{ t('suggest.activity_type') }}</span>
            <div class="edit-chips">
              <button
                v-for="cat in wizard.editDraft.value?.selectedCategories"
                :key="cat.id"
                class="edit-chip edit-chip--active"
                @click="wizard.draftToggleCategory(cat)"
              >
                {{ tc(cat.name_i18n) }}
                <UiIcon name="i-lucide-x" size="xs" />
              </button>
              <button
                v-for="cat in availableDraftCategories"
                :key="cat.id"
                class="edit-chip"
                @click="wizard.draftSetCategory(cat)"
              >
                {{ tc(cat.name_i18n) }}
                <UiIcon name="i-lucide-plus" size="xs" />
              </button>
            </div>
          </div>

          <div v-if="wizard.editDraft.value?.customActivity" class="edit-section">
            <span class="edit-label">{{ t('suggest.custom_activity') }}</span>
            <div class="edit-chips">
              <button
                class="edit-chip edit-chip--active"
                @click="wizard.draftClearCustomActivity()"
              >
                {{ wizard.editDraft.value?.customActivity }}
                <UiIcon name="i-lucide-x" size="xs" />
              </button>
            </div>
          </div>

          <div class="edit-section">
            <span class="edit-label">{{ t('suggest.season') }}</span>
            <div class="edit-chips">
              <button
                v-for="sv in wizard.editDraft.value?.selectedSeasons"
                :key="sv"
                class="edit-chip edit-chip--active"
                @click="wizard.draftToggleSeason(sv)"
              >
                {{ seasonLabelMap[sv] ?? sv }}
                <UiIcon name="i-lucide-x" size="xs" />
              </button>
              <button
                v-for="s in availableDraftSeasons"
                :key="s.value"
                class="edit-chip"
                @click="wizard.draftToggleSeason(s.value)"
              >
                {{ t(s.label_key) }}
                <UiIcon name="i-lucide-plus" size="xs" />
              </button>
            </div>
          </div>

          <div class="edit-section">
            <span class="edit-label">{{ t('suggest.ages') }}</span>
            <div class="edit-chips">
              <button
                v-for="(label, i) in wizard.editDraft.value?.selectedAgeLabels"
                :key="label"
                class="edit-chip edit-chip--active"
                @click="wizard.draftToggleAge(wizard.editDraft.value!.selectedAgeIds![i]!, label)"
              >
                {{ label }}
                <UiIcon name="i-lucide-x" size="xs" />
              </button>
              <button
                v-for="age in availableDraftAges"
                :key="age.id"
                class="edit-chip"
                @click="
                  wizard.draftToggleAge(
                    age.id,
                    ageLabel(age.label_key),
                    age.label_key === 'age.all',
                    allAgeId
                  )
                "
              >
                {{ ageLabel(age.label_key) }}
                <UiIcon name="i-lucide-plus" size="xs" />
              </button>
            </div>
          </div>
        </div>

        <div v-else class="edit-empty">
          <UiIcon name="i-lucide-info" size="sm" />
          <span>{{ t('suggest.edit_empty') }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <UiButton variant="primary" block @click="wizard.confirmEdit()">
        {{ t('common.done') }}
      </UiButton>
    </template>
  </USlideover>
</template>

<style scoped>
.wizard-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.wizard-body__sticky {
  flex-shrink: 0;
}

.wizard-body__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-secondary) transparent;
}

.wizard-body__footer {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-5);
  border-top: 0.5px solid var(--color-border-tertiary);
  flex-shrink: 0;
  gap: var(--space-2);
  background: var(--color-background-primary);
}

.step-fade-enter-active,
.step-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.step-fade-enter-from {
  opacity: 0;
  transform: translateX(8px);
}
.step-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

.edit-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.edit-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 0.5px solid var(--color-border-tertiary);
  flex-shrink: 0;
}

.edit-drawer__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.edit-drawer__close {
  width: 28px;
  height: 28px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: background 0.15s;
}

.edit-drawer__close:hover {
  background: var(--color-background-secondary);
}

.edit-drawer__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
  min-height: 0;
}

.edit-drawer__footer {
  padding: var(--space-4) var(--space-5);
  border-top: 0.5px solid var(--color-border-tertiary);
  flex-shrink: 0;
}

.edit-slideover {
  padding: var(--space-1);
}

.edit-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.edit-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.edit-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.edit-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.edit-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  padding: var(--space-1) var(--space-3);
  border-radius: 99px;
  background: var(--color-secondary-50);
  border: 0.5px solid var(--color-secondary-200);
  color: var(--color-secondary-600);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-family-base);
}

.edit-chip:hover {
  background: var(--color-secondary-100);
  border-color: var(--color-secondary-300);
}

.edit-chip--active {
  background: var(--color-secondary-100);
  border-color: var(--color-secondary-400);
  color: var(--color-secondary-800);
}

.edit-chip--active:hover {
  background: var(--color-secondary-50);
}

.edit-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-8) 0;
}
</style>
