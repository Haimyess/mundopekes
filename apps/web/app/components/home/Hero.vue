<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="hero">
    <div class="hero__text">
      <div class="hero__badge">
        <span class="hero__badge-dot" />
        {{ t('hero.badge') }}
      </div>

      <h1 class="hero__title">
        {{ t('hero.title_start') }}
        <span class="hero__accent">{{ t('hero.title_accent') }}</span>
        {{ t('hero.title_end') }}
      </h1>

      <p class="hero__subtitle">
        {{ t('hero.subtitle') }}
      </p>
    </div>

    <div class="hero__search">
      <HomeSearchForm />
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: var(--space-10) var(--space-0) var(--space-12);
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: var(--color-secondary-50);
  color: var(--color-secondary-800);
  border: 1px solid var(--color-secondary-200);
  border-radius: 9999px;
  padding: 4px 12px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-4);
}

.hero__badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-secondary-500);
  flex-shrink: 0;
}

.hero__text {
  text-align: left;
  margin-bottom: var(--space-8);
}

.hero__title {
  font-family: var(--font-family-display);
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.hero__accent {
  color: var(--color-secondary-500);
}

.hero__subtitle {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
  max-width: 36ch;
}

.hero__search {
  max-width: var(--container-xl);
  margin: 0 auto;
}

@media (min-width: 768px) {
  .hero {
    padding: var(--space-16) var(--space-4) var(--space-20);
  }

  .hero__text {
    margin-bottom: var(--space-12);
  }

  .hero__title {
    font-size: var(--font-size-5xl);
    letter-spacing: -0.04em;
  }

  .hero__subtitle {
    font-size: var(--font-size-lg);
    max-width: 48ch;
  }
}

@media (min-width: 1024px) {
  .hero__title {
    font-size: var(--font-size-6xl);
  }
}
</style>
