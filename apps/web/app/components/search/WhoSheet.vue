<script setup lang="ts">
import { CHILD_AGE_LIMITS } from '@mundopekes/core'

const DEFAULT_CHILD_AGE = 5

const { t } = useI18n()
const { agesLabel } = useSearchLabels()

const isOpen = ref(false)
const { family } = useFamily()
const { state, draft, apply } = useSearchSheet<number[]>(isOpen, (current) => [
  ...(current.ages ?? family.value?.ages ?? []),
])

const canAddChild = computed(() => draft.value.length < CHILD_AGE_LIMITS.maxChildren)
const triggerValue = computed(() => agesLabel(state.value.ages))

const handleAddChild = () => {
  draft.value = [...draft.value, DEFAULT_CHILD_AGE]
}
const handleRemoveChild = (index: number) => {
  draft.value = draft.value.filter((_, position) => position !== index)
}
const handleAgeChange = (index: number, age: number) => {
  draft.value = draft.value.map((current, position) => (position === index ? age : current))
}
const handleClear = () => {
  draft.value = []
}
const handleConfirm = () => apply({ ages: draft.value.length ? [...draft.value] : undefined })
</script>

<template>
  <UiSheet
    v-model:open="isOpen"
    :title="t('results.whoSheet.title')"
    :description="t('results.whoSheet.description')"
    :close-label="t('layout.close')"
  >
    <template #trigger>
      <SearchSheetTrigger
        :label="t('results.toolbar.who')"
        :value="triggerValue"
        icon="i-hugeicons-user-group"
      />
    </template>
    <div class="who-sheet">
      <p v-if="!draft.length" class="who-sheet__empty">{{ t('results.whoSheet.empty') }}</p>
      <ul v-else class="who-sheet__children">
        <li v-for="(age, index) in draft" :key="index" class="who-sheet__child">
          <UiStepper
            :model-value="age"
            :label="t('results.whoSheet.child', { number: index + 1 })"
            :decrement-label="t('results.whoSheet.younger', { number: index + 1 })"
            :increment-label="t('results.whoSheet.older', { number: index + 1 })"
            :min="CHILD_AGE_LIMITS.minYears"
            :max="CHILD_AGE_LIMITS.maxYears"
            :value-label="t('results.whoSheet.years', { age }, age)"
            @update:model-value="handleAgeChange(index, $event)"
          />
          <UiButton
            variant="ghost"
            size="sm"
            icon="i-hugeicons-delete-02"
            :aria-label="t('results.whoSheet.remove', { number: index + 1 })"
            @click="handleRemoveChild(index)"
          />
        </li>
      </ul>
      <UiButton
        v-if="canAddChild"
        variant="secondary"
        icon="i-hugeicons-add-01"
        @click="handleAddChild"
      >
        {{ t('results.whoSheet.add') }}
      </UiButton>
    </div>
    <template #footer>
      <SearchSheetFooter
        :confirm-label="t('results.actions.done')"
        @clear="handleClear"
        @confirm="handleConfirm"
      />
    </template>
  </UiSheet>
</template>

<style scoped>
.who-sheet {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.who-sheet__empty {
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body-sm);
}

.who-sheet__children {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.who-sheet__child {
  display: flex;
  align-items: center;
  gap: 8px;
}

.who-sheet__child > :first-child {
  flex: 1;
}
</style>
