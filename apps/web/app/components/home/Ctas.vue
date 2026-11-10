<script setup lang="ts">
const { t } = useI18n()

const isWizardOpen = ref(false)

const handleSuggest = () => {
  isWizardOpen.value = true
}
</script>

<template>
  <section class="home-ctas" aria-labelledby="home-ctas-title">
    <div class="home-ctas__card">
      <UiIcon name="i-hugeicons-idea-01" :size="32" />
      <h2 id="home-ctas-title" class="home-ctas__title">{{ t('home.ctas.suggestTitle') }}</h2>
      <p class="home-ctas__text">{{ t('home.ctas.suggestText') }}</p>
      <UiButton variant="secondary" @click="handleSuggest">{{
        t('home.ctas.suggestAction')
      }}</UiButton>
    </div>
    <SuggestionsSuggestionWizard v-model:open="isWizardOpen" />
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
</style>
