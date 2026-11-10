<script setup lang="ts">
import { serializeWhen, WHEN_SHORTCUTS, type When } from '@mundopekes/core'
import type { SearchOccasion } from '#shared/types/search'

interface Props {
  occasion: SearchOccasion | null
}

const props = defineProps<Props>()

const { t } = useI18n()
const { tc } = useI18nContent()
const { whenLabel } = useSearchLabels()

const isOpen = ref(false)
const { state, draft, apply } = useSearchSheet<When | undefined>(isOpen, (current) => current.when)

interface WhenOption {
  key: string
  label: string
  when: When
  isSelected: boolean
}

const draftKey = computed(() => (draft.value ? serializeWhen(draft.value) : null))

function toOption(when: When, label: string): WhenOption {
  const key = serializeWhen(when)
  return { key, label, when, isSelected: draftKey.value === key }
}

const options = computed<WhenOption[]>(() => [
  ...WHEN_SHORTCUTS.map((shortcut) =>
    toOption({ kind: 'shortcut', shortcut }, t(`results.when.${shortcut}`))
  ),
  ...(props.occasion
    ? [toOption({ kind: 'occasion', key: props.occasion.key }, tc(props.occasion.name))]
    : []),
])

const selectedDate = computed<string | null>({
  get: () => (draft.value?.kind === 'fixed' ? draft.value.range.from : null),
  set: (date) => {
    draft.value = date ? { kind: 'fixed', range: { from: date, to: date } } : undefined
  },
})

const triggerValue = computed(() => whenLabel(state.value.when, props.occasion))

const handleSelect = (option: WhenOption) => {
  draft.value = option.isSelected ? undefined : option.when
}
const handleClear = () => {
  draft.value = undefined
}
const handleConfirm = () => apply({ when: draft.value })
</script>

<template>
  <UiSheet
    v-model:open="isOpen"
    :title="t('results.whenSheet.title')"
    :close-label="t('layout.close')"
  >
    <template #trigger>
      <SearchSheetTrigger
        :label="t('results.toolbar.when')"
        :value="triggerValue"
        icon="i-hugeicons-calendar-03"
      />
    </template>
    <div class="when-sheet">
      <ul class="when-sheet__options" :aria-label="t('results.whenSheet.shortcuts')">
        <li v-for="option in options" :key="option.key">
          <UiChip :selected="option.isSelected" @toggle="handleSelect(option)">
            {{ option.label }}
          </UiChip>
        </li>
      </ul>
      <UiCalendar v-model="selectedDate" :label="t('results.whenSheet.calendar')" />
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
.when-sheet {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.when-sheet__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
