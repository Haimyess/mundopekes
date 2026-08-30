<script setup lang="ts">
// Selector de rangos de edad (badges toggle). modelValue = array de ids.
// allId opcional: el id del rango "todas las edades" (mutuamente excluyente).
interface AgeOption {
  id: number
  label_key: string
}

const props = withDefaults(
  defineProps<{
    modelValue: number[]
    options: AgeOption[]
    labels?: Record<string, string>
    allId?: number
    loadingLabel?: string
  }>(),
  { loadingLabel: 'Loading…' }
)

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const label = (opt: AgeOption) => props.labels?.[opt.label_key] ?? opt.label_key

const toggle = (id: number) => {
  // Click en "todas" → reemplaza todo
  if (props.allId !== undefined && id === props.allId) {
    emit('update:modelValue', props.modelValue.includes(id) ? [] : [id])
    return
  }
  let next = [...props.modelValue]
  // Al elegir un específico, quitamos "todas"
  if (props.allId !== undefined) next = next.filter((x) => x !== props.allId)
  const idx = next.indexOf(id)
  if (idx === -1) next.push(id)
  else next.splice(idx, 1)
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="flex flex-wrap gap-2 mt-1">
    <UBadge
      v-for="opt in options"
      :key="opt.id"
      :color="modelValue.includes(opt.id) ? 'secondary' : 'neutral'"
      :variant="modelValue.includes(opt.id) ? 'solid' : 'subtle'"
      class="cursor-pointer select-none"
      @click="toggle(opt.id)"
    >
      {{ label(opt) }}
    </UBadge>
    <span v-if="!options.length" class="text-xs text-(--ui-text-muted)">{{ loadingLabel }}</span>
  </div>
</template>
