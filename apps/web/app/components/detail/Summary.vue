<script setup lang="ts">
import type { AgeSpanYears } from '#shared/types/search'

interface Props {
  title: string
  subtitle?: string | null
  ageSpan?: AgeSpanYears | null
  isFree?: boolean
  price?: number | null
  isOpenNow?: boolean | null
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: null,
  ageSpan: null,
  isFree: false,
  price: null,
  isOpenNow: null,
})

const { t, locale } = useI18n()

const priceLabel = computed(() => {
  if (props.isFree || props.price === 0) return t('results.free')
  return props.price === null
    ? null
    : t('detail.from', { price: formatPrice(props.price, locale.value) })
})
</script>

<template>
  <header class="detail-summary">
    <h1 class="detail-summary__title">{{ title }}</h1>
    <p v-if="subtitle" class="detail-summary__subtitle">{{ subtitle }}</p>
    <ul class="detail-summary__facts">
      <li v-if="ageSpan" class="detail-summary__fact">
        <UiIcon name="i-hugeicons-user-group" :size="16" />
        {{ t('results.agesLabel', { min: ageSpan.min, max: ageSpan.max }) }}
      </li>
      <li v-if="priceLabel" class="detail-summary__fact">
        <UiIcon name="i-hugeicons-ticket-01" :size="16" />
        <bdi>{{ priceLabel }}</bdi>
      </li>
      <li
        v-if="isOpenNow !== null"
        class="detail-summary__fact"
        :class="isOpenNow ? 'detail-summary__fact--open' : 'detail-summary__fact--closed'"
      >
        <UiIcon name="i-hugeicons-clock-01" :size="16" />
        {{ isOpenNow ? t('detail.openNow') : t('detail.closedNow') }}
      </li>
    </ul>
  </header>
</template>

<style scoped>
.detail-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-summary__title {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-detail-title);
  font-weight: var(--mp-fw-heavy);
  letter-spacing: var(--mp-ls-detail-title);
}

.detail-summary__subtitle {
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body);
}

.detail-summary__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.detail-summary__fact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
  color: var(--mp-ink);
  font-size: var(--mp-fs-body-sm);
}

.detail-summary__fact--open {
  border-color: var(--mp-green);
  color: var(--mp-green);
}

.detail-summary__fact--closed {
  color: var(--mp-text-2);
}
</style>
