<script setup lang="ts">
const { t } = useI18n()
const wizardOpen = ref(false)
</script>

<template>
  <section class="cta">
    <div class="cta__inner">
      <div class="cta__text">
        <h2 class="cta__title">{{ t('cta.title') }}</h2>
        <p class="cta__desc">{{ t('cta.description') }}</p>
      </div>
      <UiButton class="cta__btn" @click="wizardOpen = true"> Sugerir un lugar </UiButton>
    </div>
    <SuggestionsSuggestionWizard v-model:open="wizardOpen" />
  </section>
</template>

<style scoped>
.cta {
  padding: var(--space-10) 0 var(--space-12);
}

.cta__inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-5);
  border: 1.5px solid var(--color-neutral-200, #e5e5e5);
  border-radius: var(--border-radius-2xl, 1.5rem);
  padding: var(--space-8) var(--space-7);
  background: var(--color-neutral-50, #fafafa);
}

.cta__title {
  font-family: var(--font-family-display);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2);
  line-height: 1.2;
}

.cta__desc {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: var(--line-height-relaxed);
  max-width: 40ch;
}

.cta__btn {
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .cta__inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .cta__text {
    flex: 1;
  }
}
</style>
