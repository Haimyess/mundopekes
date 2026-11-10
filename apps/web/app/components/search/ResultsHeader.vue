<script setup lang="ts">
interface Props {
  title: string
  total: number | null
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <header class="results-header">
    <h1 class="results-header__title">{{ title }}</h1>
    <p class="results-header__count" role="status" aria-live="polite">
      <template v-if="total !== null">{{ t('results.count', total) }}</template>
    </p>
  </header>
</template>

<style scoped>
.results-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-block: 16px 12px;
}

.results-header__title {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-h1);
  font-weight: var(--mp-fw-heavy);
  letter-spacing: var(--mp-ls-h1);
}

.results-header__count {
  min-block-size: 1.4em;
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body-sm);
}
</style>
