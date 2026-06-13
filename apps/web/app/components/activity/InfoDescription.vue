<script setup lang="ts">
/**
 * Activity > InfoDescription
 * Descripción de la actividad en una card.
 * Soporte para truncado con "leer más" si el texto es largo.
 */

interface Props {
  description: string
  maxLines?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxLines: 5,
})

const { t } = useI18n()
const expanded = ref(false)
const contentEl = ref<HTMLElement | null>(null)
const isTruncatable = ref(false)

onMounted(() => {
  if (!contentEl.value) return
  // Verificar si el contenido excede el límite de líneas
  const lineHeight = Number.parseInt(getComputedStyle(contentEl.value).lineHeight)
  const maxHeight = lineHeight * props.maxLines
  isTruncatable.value = contentEl.value.scrollHeight > maxHeight + 4
})
</script>

<template>
  <div class="info-desc">
    <h2 class="info-desc__label">{{ t('activity.description') }}</h2>
    <div
      ref="contentEl"
      class="info-desc__text"
      :class="{ 'info-desc__text--clamped': isTruncatable && !expanded }"
      :style="isTruncatable && !expanded ? `--max-lines: ${maxLines}` : ''"
    >
      {{ description }}
    </div>
    <button v-if="isTruncatable" class="info-desc__toggle" @click="expanded = !expanded">
      {{ expanded ? t('common.read_less') : t('common.read_more') }}
      <UIcon
        :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
        class="info-desc__toggle-icon"
      />
    </button>
  </div>
</template>

<style scoped>
.info-desc__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 var(--space-2);
}

.info-desc__text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  margin: 0;
}

.info-desc__text--clamped {
  display: -webkit-box;
  -webkit-line-clamp: var(--max-lines, 5);
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-desc__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-block-start: var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-secondary-600, #16a34a);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.info-desc__toggle-icon {
  width: 0.875rem;
  height: 0.875rem;
}
</style>
