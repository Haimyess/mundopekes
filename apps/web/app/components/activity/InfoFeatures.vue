<script setup lang="ts">
/**
 * Activity > InfoFeatures
 * Grid de chips con íconos — como "מאפייני העגלה" de coffeetrail.
 * Muestra: edad, temporadas, gratis, stroller, open weekends.
 */

import type { Activity } from '~/types'

interface Props {
  activity: Activity
}

const props = defineProps<Props>()
const { t } = useI18n()
const { formatAgeRange } = useAgeRange()

const seasonConfig: Record<string, { icon: string }> = {
  spring:   { icon: '🌸' },
  summer:   { icon: '☀️' },
  fall:     { icon: '🍂' },
  autumn:   { icon: '🍂' },
  winter:   { icon: '❄️' },
  all_year: { icon: '🌍' }
}

interface Chip {
  key: string
  emoji?: string
  uicon?: string
  label: string
  type: 'age' | 'season' | 'free' | 'feature'
}

const chips = computed((): Chip[] => {
  if (!props.activity) return []
  const list: Chip[] = []

  // Edad
  if (props.activity.age_ranges?.length) {
    list.push({
      key: 'age',
      emoji: '👶',
      label: formatAgeRange(props.activity.age_ranges),
      type: 'age'
    })
  }

  // Temporadas
  for (const s of (props.activity.seasons ?? [])) {
    const cfg = seasonConfig[s.value?.toLowerCase()] ?? { icon: '🌍' }
    const label = s.label_key ? t(s.label_key) : s.value
    list.push({ key: `season-${s.id}`, emoji: cfg.icon, label, type: 'season' })
  }

  // Gratuita
  if (props.activity.is_free) {
    list.push({ key: 'free', uicon: 'i-heroicons-banknotes', label: t('activity.free'), type: 'free' })
  }

  // Stroller friendly
  if (props.activity.stroller_friendly) {
    list.push({ key: 'stroller', uicon: 'i-heroicons-heart', label: t('activity.stroller_friendly'), type: 'feature' })
  }

  // Fines de semana
  if (props.activity.open_weekends) {
    list.push({ key: 'weekends', uicon: 'i-heroicons-calendar-days', label: t('activity.open_weekends'), type: 'feature' })
  }

  return list
})
</script>

<template>
  <div v-if="chips.length" class="info-section">

    <!-- Header -->
    <div class="info-section__title">
      <span class="info-section__title-icon-wrap info-section__title-icon-wrap--amber">
        <UIcon name="i-heroicons-sparkles" class="info-section__title-icon" />
      </span>
      {{ t('activity.features') }}
    </div>

    <!-- Grid de chips -->
    <div class="info-section__body">
      <div class="info-features__grid">
        <div
          v-for="chip in chips"
          :key="chip.key"
          class="info-features__chip"
          :class="`info-features__chip--${chip.type}`"
        >
          <!-- Emoji o UIcon -->
          <span v-if="chip.emoji" class="info-features__chip-icon info-features__chip-icon--emoji">
            {{ chip.emoji }}
          </span>
          <UIcon
            v-else-if="chip.uicon"
            :name="chip.uicon"
            class="info-features__chip-icon info-features__chip-icon--ui"
          />
          <span class="info-features__chip-label">{{ chip.label }}</span>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Card base ───────────────────────────────────────────────── */
.info-section {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--border-radius-xl);
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────────── */
.info-section__title {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  font-family: var(--font-family-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--color-neutral-100);
  background: var(--color-neutral-50);
}

.info-section__title-icon-wrap {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-section__title-icon-wrap--amber { background: #fef3c7; }
.info-section__title-icon-wrap--amber .info-section__title-icon { color: #d97706; }
.info-section__title-icon { width: 0.875rem; height: 0.875rem; }

.info-section__body {
  padding: var(--space-4) var(--space-5);
}

/* ── Chips grid ──────────────────────────────────────────────── */
.info-features__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.info-features__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--color-neutral-200);
  background: var(--color-neutral-50);
  color: var(--color-text-secondary);
  transition: background var(--transition-fast), transform var(--transition-fast);
  cursor: default;
}

.info-features__chip:hover {
  background: var(--color-neutral-100);
  transform: translateY(-1px);
}

.info-features__chip-icon--emoji {
  font-size: 1rem;
  line-height: 1;
}

.info-features__chip-icon--ui {
  width: 0.9rem;
  height: 0.9rem;
  flex-shrink: 0;
}

.info-features__chip-label {
  line-height: 1;
}

/* ── Variantes de color ──────────────────────────────────────── */
.info-features__chip--free {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

.info-features__chip--age {
  background: #ede9fe;
  border-color: #ddd6fe;
  color: #6d28d9;
}

.info-features__chip--season {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}

.info-features__chip--feature {
  background: #f0f9ff;
  border-color: #bae6fd;
  color: #0369a1;
}
</style>