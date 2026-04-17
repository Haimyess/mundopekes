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
  maxLines: 5
})

const { t } = useI18n()
const expanded = ref(false)
const contentEl = ref<HTMLElement | null>(null)
const isTruncatable = ref(false)

onMounted(() => {
  if (!contentEl.value) return
  // Verificar si el contenido excede el límite de líneas
  const lineHeight = parseInt(getComputedStyle(contentEl.value).lineHeight)
  const maxHeight = lineHeight * props.maxLines
  isTruncatable.value = contentEl.value.scrollHeight > maxHeight + 4
})
</script>

<template>
  <div class="info-section">
    <h2 class="info-section__title">
      <span class="info-section__title-icon-wrap info-section__title-icon-wrap--violet">
        <UIcon name="i-heroicons-document-text" class="info-section__title-icon" />
      </span>
      {{ t('activity.description') }}
    </h2>
    <div class="info-section__body">
      <div
        ref="contentEl"
        class="info-description__text"
        :class="{ 'info-description__text--clamped': isTruncatable && !expanded }"
        :style="isTruncatable && !expanded ? `--max-lines: ${maxLines}` : ''"
      >
        {{ description }}
      </div>

      <button
        v-if="isTruncatable"
        class="info-description__toggle"
        @click="expanded = !expanded"
      >
        {{ expanded ? t('common.read_less') : t('common.read_more') }}
        <UIcon
          :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="info-description__toggle-icon"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.info-section {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--border-radius-xl);
  overflow: hidden;
}

.info-section__title {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  font-family: var(--font-family-display);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-neutral-100);
  margin: 0;
  background: var(--color-neutral-50);
}

.info-section__title-icon-wrap {
  width: 2rem;
  height: 2rem;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-section__title-icon-wrap--violet { background: #ede9fe; }
.info-section__title-icon-wrap--violet .info-section__title-icon { color: #7c3aed; }

.info-section__title-icon {
  width: 1rem;
  height: 1rem;
}

.info-section__body {
  padding: var(--space-4) var(--space-5);
}

/* ── Description ─────────────────────────────────────────────── */
.info-description__text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  margin: 0;
  transition: max-height 0.3s ease;
}

.info-description__text--clamped {
  display: -webkit-box;
  -webkit-line-clamp: var(--max-lines, 5);
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-description__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-600);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.info-description__toggle:hover {
  color: var(--color-primary-700);
}

.info-description__toggle-icon {
  width: 0.875rem;
  height: 0.875rem;
}
</style>