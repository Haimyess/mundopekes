<script setup lang="ts">
import type { ActivityFilters } from '~/types'

const { t } = useI18n()
const { getFilterChips } = useActivityFilters()

const props = defineProps<{ filters: ActivityFilters }>()

const emit = defineEmits<{
  'remove': [key: keyof ActivityFilters, cityValue?: string]
  'clear': []
}>()

const chips = computed(() => getFilterChips(props.filters))
</script>

<template>
  <template v-if="chips.length">
    <button
      v-for="(chip, i) in chips"
      :key="`${chip.key}-${i}`"
      class="chip"
      :class="chip.key === 'search' ? 'chip--search' : 'chip--filter'"
      @click="emit('remove', chip.key, chip.cityValue)"
    >
      <UIcon
        :name="chip.key === 'search' ? 'i-heroicons-magnifying-glass' : 'i-heroicons-tag'"
        class="chip__icon"
      />
      <span>{{ chip.label }}</span>
      <UIcon name="i-heroicons-x-mark" class="chip__close" />
    </button>
  </template>
</template>

<style scoped>
/* ── Base chip ───────────────────────────────────────────────── */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background-color 0.15s ease;
  cursor: pointer;
  border: none;
  outline: none;
}

/* ── Chip de búsqueda (query text) — verde más claro ─────────── */
.chip--search {
  background-color: var(--color-secondary-100);
  color: var(--color-secondary-700);
  border: 1px solid var(--color-secondary-100);
}

.chip--search:hover {
  background-color: var(--color-primary-100, #dcfce7);
}

/* ── Chip de filtro — verde medio ────────────────────────────── */
.chip--filter {
  background-color: var(--color-secondary-100);
  color: var(--color-secondary-800,);
  border: 1px solid var(--color-secondary-100);
}

.chip--filter:hover {
  background-color: var(--color-secondary-400, #bbf7d0);
}

/* ── Íconos ──────────────────────────────────────────────────── */
.chip__icon {
  width: 0.875rem;
  height: 0.875rem;
  opacity: 0.7;
  flex-shrink: 0;
  color: var(--color-secundary-700);
}

.chip__close {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  opacity: 0.6;
   color: var(--color-secundary-700);
}
</style>