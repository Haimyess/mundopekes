<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <aside class="business-results-cta" :aria-label="t('business.cta.footer')">
    <p class="business-results-cta__title">{{ t('business.cta.resultsTitle') }}</p>
    <NuxtLink to="/business" class="business-results-cta__link">
      {{ t('business.cta.resultsAction') }}
    </NuxtLink>
  </aside>
</template>

<style scoped>
.business-results-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-block-start: 32px;
  padding: 16px;
  border-block-start: 1px solid var(--mp-border-soft);
  text-align: center;
}

.business-results-cta__title {
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body);
}

.business-results-cta__link {
  color: var(--mp-ink);
  font-weight: var(--mp-fw-bold);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.business-results-cta__link:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}
</style>
