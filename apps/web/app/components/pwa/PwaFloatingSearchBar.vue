<script setup lang="ts">
/**
 * Barra flotante sobre el mapa full-bleed de PwaExploreScreen: input de
 * texto libre + botón de filtros con badge de conteo. El debounce y el
 * armado de la query URL viven en el padre (mismo mecanismo que ya usa
 * search.vue) — este componente es puramente presentacional.
 */
interface Props {
  modelValue: string
  activeFiltersCount: number
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'open-filters': []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="pwa-search-bar">
    <div class="pwa-search-bar__input-wrap">
      <UIcon name="i-heroicons-magnifying-glass" class="pwa-search-bar__icon" />
      <input
        type="search"
        class="pwa-search-bar__input"
        :placeholder="t('hero.search_placeholder')"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <button
      type="button"
      class="pwa-search-bar__filter-btn"
      :aria-label="t('search.filters')"
      @click="emit('open-filters')"
    >
      <UIcon name="i-heroicons-adjustments-horizontal" class="pwa-search-bar__icon" />
      <span v-if="activeFiltersCount > 0" class="pwa-search-bar__badge">
        {{ activeFiltersCount }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.pwa-search-bar {
  position: absolute;
  inset-inline: 0;
  /* Sin PwaTopBar en esta pantalla (mapa full-bleed) — esta barra hace
     ese rol, así que necesita su propio respiro de safe-area-inset-top
     para no quedar debajo del status bar/notch. */
  top: calc(var(--safe-area-inset-top) + var(--space-3));
  z-index: 6;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-inline: var(--space-3);
}

.pwa-search-bar__input-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2-5, 0.625rem) var(--space-4);
  border-radius: var(--border-radius-full);
  background: var(--color-bg-primary);
  box-shadow: var(--shadow-lg);
}

.pwa-search-bar__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: none;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.pwa-search-bar__input::placeholder {
  color: var(--color-text-tertiary);
}

.pwa-search-bar__filter-btn {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: var(--border-radius-full);
  background: var(--color-bg-primary);
  box-shadow: var(--shadow-lg);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.pwa-search-bar__icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.pwa-search-bar__badge {
  position: absolute;
  top: -2px;
  inset-inline-end: -2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.125rem;
  height: 1.125rem;
  padding-inline: 3px;
  border-radius: var(--border-radius-full);
  background: var(--color-accent-500);
  color: white;
  font-size: 0.625rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
}
</style>
