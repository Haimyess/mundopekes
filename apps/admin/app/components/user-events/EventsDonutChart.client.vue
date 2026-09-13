<script setup lang="ts">
import { VisSingleContainer, VisDonut, VisBulletLegend } from '@unovis/vue'

interface Slice {
  label: string
  value: number
}

const props = withDefaults(
  defineProps<{
    data: Slice[]
    size?: number
  }>(),
  { size: 200 }
)

// Paleta de tokens semánticos de Nuxt UI (apps/admin/app/app.config.ts define
// primary/neutral; el resto los completa el módulo con sus defaults) — se
// adapta sola a claro/oscuro, igual que --ui-primary en EventsChart.client.vue.
const COLORS = [
  'var(--ui-primary)',
  'var(--ui-secondary)',
  'var(--ui-warning)',
  'var(--ui-error)',
  'var(--ui-info)',
  'var(--ui-success)',
]

const value = (d: Slice) => d.value
const color = (_d: Slice, i: number) => COLORS[i % COLORS.length]

const total = computed(() => props.data.reduce((sum, d) => sum + d.value, 0))

const legendItems = computed(() =>
  props.data.map((d, i) => {
    const pct = total.value ? Math.round((d.value / total.value) * 100) : 0
    return {
      name: `${d.label} — ${d.value} (${pct}%)`,
      color: COLORS[i % COLORS.length],
    }
  })
)
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center gap-4">
    <VisSingleContainer :data="data" :height="size" :width="size">
      <VisDonut
        :value="value"
        :color="color"
        :arc-width="size / 7"
        :pad-angle="0.02"
        :corner-radius="2"
      />
    </VisSingleContainer>
    <VisBulletLegend :items="legendItems" orientation="vertical" class="text-sm" />
  </div>
</template>
