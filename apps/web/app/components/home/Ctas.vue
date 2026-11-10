<script setup lang="ts">
const { t } = useI18n()

const isSuggestionOpen = ref(false)
</script>

<template>
  <section class="home-ctas" aria-labelledby="home-ctas-title">
    <div class="home-ctas__card">
      <UiIcon name="i-hugeicons-idea-01" :size="32" />
      <h2 id="home-ctas-title" class="home-ctas__title">{{ t('home.ctas.suggestTitle') }}</h2>
      <p class="home-ctas__text">{{ t('home.ctas.suggestText') }}</p>
      <SuggestionsQuickSheet v-model:open="isSuggestionOpen" origin="home">
        <template #trigger>
          <button type="button" class="home-ctas__action">
            {{ t('home.ctas.suggestAction') }}
          </button>
        </template>
      </SuggestionsQuickSheet>
    </div>
  </section>
</template>

<style scoped>
.home-ctas__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 24px;
  border-radius: var(--mp-r-panel);
  background: var(--mp-coral-50);
  color: var(--mp-ink);
}

.home-ctas__title {
  margin: 0;
  font-size: var(--mp-fs-section-title);
  font-weight: var(--mp-fw-heavy);
  letter-spacing: var(--mp-ls-section-title);
}

.home-ctas__text {
  margin: 0;
  color: var(--mp-text-2);
}

.home-ctas__action {
  min-block-size: var(--mp-tap);
  padding-inline: 18px;
  border: 1px solid var(--mp-ink);
  border-radius: var(--mp-r-btn);
  background: var(--mp-surface);
  color: var(--mp-ink);
  font: inherit;
  font-weight: var(--mp-fw-bold);
  cursor: pointer;
}

.home-ctas__action:focus-visible {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}
</style>
