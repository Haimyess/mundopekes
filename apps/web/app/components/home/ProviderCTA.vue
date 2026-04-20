<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="provider-cta">
    <div class="provider-cta__inner">
      <h2 class="provider-cta__title">{{ t('provider.cta_title') }}</h2>
      <p class="provider-cta__subtitle">{{ t('provider.cta_subtitle') }}</p>
      <NuxtLink to="/become-provider">
        <UiButton variant="secondary" size="lg">
          {{ t('provider.cta_button') }}
        </UiButton>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.provider-cta {
  padding: var(--spacing-12, 3rem) var(--spacing-4, 1rem);
}

.provider-cta__inner {
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
  background: var(--color-secondary-50, #f9fafb);
  border: 1px solid var(--color-secondary-200, #e5e7eb);
  border-radius: var(--radius-2xl, 1rem);
  padding: var(--spacing-10, 2.5rem) var(--spacing-8, 2rem);
}

.provider-cta__title {
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  font-weight: 800;
  color: var(--color-secondary-900, #111827);
  margin-bottom: var(--spacing-3, 0.75rem);
}

.provider-cta__subtitle {
  font-size: 1rem;
  color: var(--color-secondary-500, #6b7280);
  margin-bottom: var(--spacing-6, 1.5rem);
}
</style>
