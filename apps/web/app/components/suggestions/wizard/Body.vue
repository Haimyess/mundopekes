<script setup lang="ts">
import { useSuggestionWizard } from '~/composables/useSuggestionWizard'

const props = defineProps<{
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

const ALL_CATEGORIES = [
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

const ALL_SEASONS = ['Primavera', 'Verano', 'Otoño', 'Invierno', 'Todo el año']

const ALL_AGES = [
  { id: 6, label: 'Bebés (0–11m)' },
  { id: 7, label: 'Pequeños (1–3 años)' },
  { id: 8, label: 'Preescolar (3–6 años)' },
  { id: 9, label: 'Escolar (6–12 años)' },
  { id: 10, label: 'Adolescentes (12+)' },
  { id: 11, label: 'Todas las edades' },
]

const availableDraftCategories = computed(() =>
  ALL_CATEGORIES.filter(
    (c) => !wizard.editDraft.value?.selectedCategories?.some((s) => s.id === c.id)
  )
)

const availableDraftSeasons = computed(() =>
  ALL_SEASONS.filter((s) => !wizard.editDraft.value?.selectedSeasons?.includes(s))
)

const availableDraftAges = computed(() =>
  ALL_AGES.filter((a) => !wizard.editDraft.value?.selectedAgeIds?.includes(a.id))
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
                  {{ cat.name }}
                  <UiIcon name="i-lucide-x" size="xs" />
                </button>
                <button
                  v-for="cat in availableDraftCategories"
                  :key="cat.id"
                  class="edit-chip"
                  @click="wizard.draftSetCategory(cat)"
                >
                  {{ cat.name }}
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
                  v-for="season in wizard.editDraft.value?.selectedSeasons"
                  :key="season"
                  class="edit-chip edit-chip--active"
                  @click="wizard.draftToggleSeason(season)"
                >
                  {{ season }}
                  <UiIcon name="i-lucide-x" size="xs" />
                </button>
                <button
                  v-for="season in availableDraftSeasons"
                  :key="season"
                  class="edit-chip"
                  @click="wizard.draftToggleSeason(season)"
                >
                  {{ season }}
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
                  @click="wizard.draftToggleAge(age.id, age.label)"
                >
                  {{ age.label }}
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
                {{ cat.name }}
                <UiIcon name="i-lucide-x" size="xs" />
              </button>
              <button
                v-for="cat in availableDraftCategories"
                :key="cat.id"
                class="edit-chip"
                @click="wizard.draftSetCategory(cat)"
              >
                {{ cat.name }}
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
                v-for="season in wizard.editDraft.value?.selectedSeasons"
                :key="season"
                class="edit-chip edit-chip--active"
                @click="wizard.draftToggleSeason(season)"
              >
                {{ season }}
                <UiIcon name="i-lucide-x" size="xs" />
              </button>
              <button
                v-for="season in availableDraftSeasons"
                :key="season"
                class="edit-chip"
                @click="wizard.draftToggleSeason(season)"
              >
                {{ season }}
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
                @click="wizard.draftToggleAge(age.id, age.label)"
              >
                {{ age.label }}
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
