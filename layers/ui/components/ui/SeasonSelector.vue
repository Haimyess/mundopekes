<script setup lang="ts">
// Selector de temporadas (badges toggle). modelValue = array de VALUES (p.ej. 'spring').
// 'all' es mutuamente excluyente con las específicas.
interface SeasonOption {
  value: string
  label_key: string
}

const props = defineProps<{
  modelValue: string[]
  options: SeasonOption[]
  labels?: Record<string, string>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const label = (opt: SeasonOption) =>
  props.labels?.[opt.value] ?? props.labels?.[opt.label_key] ?? opt.value

const toggle = (value: string) => {
  if (value === 'all') {
    emit('update:modelValue', props.modelValue.includes('all') ? [] : ['all'])
    return
  }
  let next = props.modelValue.filter((x) => x !== 'all')
  const idx = next.indexOf(value)
  if (idx === -1) next.push(value)
  else next = next.filter((x) => x !== value)
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="flex flex-wrap gap-2 mt-1">
    <UBadge
      v-for="opt in options"
      :key="opt.value"
      :color="modelValue.includes(opt.value) ? 'info' : 'neutral'"
      :variant="modelValue.includes(opt.value) ? 'solid' : 'subtle'"
      class="cursor-pointer select-none"
      @click="toggle(opt.value)"
    >
      {{ label(opt) }}
    </UBadge>
    <span v-if="!options.length" class="text-xs text-(--ui-text-muted)">Cargando…</span>
  </div>
</template>
