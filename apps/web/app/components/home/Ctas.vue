<script setup lang="ts">
const { t } = useI18n()

const isSuggestionOpen = ref(false)
</script>

<template>
  <section class="home-ctas" :aria-label="t('home.ctas.label')">
    <div class="home-ctas__card home-ctas__card--suggest">
      <UiIcon name="i-hugeicons-idea-01" :size="32" />
      <h2 class="home-ctas__title">{{ t('home.ctas.suggestTitle') }}</h2>
      <p class="home-ctas__text">{{ t('home.ctas.suggestText') }}</p>
      <SuggestionsQuickSheet v-model:open="isSuggestionOpen" origin="home">
        <template #trigger>
          <button type="button" class="home-ctas__action">
            {{ t('home.ctas.suggestAction') }}
          </button>
        </template>
      </SuggestionsQuickSheet>
    </div>
    <div class="home-ctas__card home-ctas__card--business">
      <UiIcon name="i-hugeicons-store-01" :size="32" />
      <h2 class="home-ctas__title">{{ t('business.cta.homeTitle') }}</h2>
      <p class="home-ctas__text">{{ t('business.cta.homeText') }}</p>
      <NuxtLink to="/business" class="home-ctas__action">
        {{ t('business.cta.homeAction') }}
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.home-ctas {
  display: grid;
  gap: 16px;
}

.home-ctas__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 24px;
  border-radius: var(--mp-r-panel);
  color: var(--mp-ink);
}

.home-ctas__card--suggest {
  background: var(--mp-coral-50);
}

.home-ctas__card--business {
  border: 1px solid var(--mp-border);
  background: var(--mp-surface);
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
  display: inline-flex;
  align-items: center;
  min-block-size: var(--mp-tap);
  margin-block-start: auto;
  padding-inline: 18px;
  border: 1px solid var(--mp-ink);
  border-radius: var(--mp-r-btn);
  background: var(--mp-surface);
  color: var(--mp-ink);
  font: inherit;
  font-weight: var(--mp-fw-bold);
  text-decoration: none;
  cursor: pointer;
}

.home-ctas__action:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

@media (min-width: 768px) {
  .home-ctas {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
