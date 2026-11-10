<script setup lang="ts">
import { serializeWhen, WHEN_SHORTCUTS, type When } from '@mundopekes/core'
import type { SearchOccasion } from '#shared/types/search'

interface Props {
  occasion: SearchOccasion | null
}

const props = defineProps<Props>()

const { t } = useI18n()
const { tc } = useI18nContent()
const { state, linkTo } = useSearchState()

interface QuickChip {
  key: string
  label: string
  isSelected: boolean
  to: string
}

const selectedWhen = computed(() => (state.value.when ? serializeWhen(state.value.when) : null))

function toWhenChip(when: When, label: string): QuickChip {
  const value = serializeWhen(when)
  const isSelected = selectedWhen.value === value
  return { key: value, label, isSelected, to: linkTo({ when: isSelected ? undefined : when }) }
}

const chips = computed<QuickChip[]>(() => {
  const whenChips = WHEN_SHORTCUTS.map((shortcut) =>
    toWhenChip({ kind: 'shortcut', shortcut }, t(`results.when.${shortcut}`))
  )
  const occasionChip = props.occasion
    ? [toWhenChip({ kind: 'occasion', key: props.occasion.key }, tc(props.occasion.name))]
    : []
  return [...whenChips, ...occasionChip]
})
</script>

<template>
  <ul class="quick-chips" :aria-label="t('results.quickFilters')">
    <li v-for="chip in chips" :key="chip.key">
      <UiChip :to="chip.to" :selected="chip.isSelected" size="sm">
        {{ chip.label }}
      </UiChip>
    </li>
  </ul>
</template>

<style scoped>
.quick-chips {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 0 0 16px;
  list-style: none;
  overflow-x: auto;
  scrollbar-width: none;
}

.quick-chips::-webkit-scrollbar {
  display: none;
}
</style>
