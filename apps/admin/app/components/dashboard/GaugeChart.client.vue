<script setup lang="ts">
import { VisSingleContainer, VisDonut } from '@unovis/vue'

interface Slice {
  key: 'value' | 'rest'
  v: number
}

const props = defineProps<{
  value: number // 0..1
  caption?: string
}>()

const data = computed<Slice[]>(() => [
  { key: 'value', v: props.value },
  { key: 'rest', v: 1 - props.value },
])

const valueAccessor = (d: Slice) => d.v
const colorAccessor = (d: Slice) =>
  d.key === 'value' ? 'var(--ui-primary)' : 'var(--ui-bg-accented)'
const percentLabel = computed(() => `${Math.round(props.value * 100)}%`)
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <VisSingleContainer :data="data" :height="120" width="220">
      <VisDonut
        :value="valueAccessor"
        :color="colorAccessor"
        :angle-range="[-Math.PI / 2, Math.PI / 2]"
        :arc-width="22"
        :corner-radius="4"
        :central-label="percentLabel"
      />
    </VisSingleContainer>
    <p v-if="caption" class="text-xs text-(--ui-text-muted) text-center -mt-2">{{ caption }}</p>
  </div>
</template>
