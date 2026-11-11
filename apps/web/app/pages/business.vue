<script setup lang="ts">
const BENEFITS = [
  { key: 'directory', icon: 'i-hugeicons-store-location-01' },
  { key: 'search', icon: 'i-hugeicons-search-01' },
  { key: 'views', icon: 'i-hugeicons-analytics-01' },
] as const

const { t } = useI18n()

useSeoMeta({
  title: () => t('business.seo.title'),
  description: () => t('business.seo.description'),
  ogTitle: () => t('business.seo.title'),
  ogDescription: () => t('business.seo.description'),
})
</script>

<template>
  <div class="business-page">
    <header class="business-page__hero">
      <p class="business-page__eyebrow">{{ t('business.hero.eyebrow') }}</p>
      <h1 class="business-page__title">{{ t('business.hero.title') }}</h1>
      <p class="business-page__lead">{{ t('business.hero.text') }}</p>
    </header>
    <div class="business-page__layout">
      <div class="business-page__content">
        <section aria-labelledby="business-benefits-title">
          <h2 id="business-benefits-title" class="business-page__section-title">
            {{ t('business.benefitsTitle') }}
          </h2>
          <ul class="business-page__benefits">
            <li v-for="benefit in BENEFITS" :key="benefit.key" class="business-page__benefit">
              <UiIcon :name="benefit.icon" :size="24" class="business-page__benefit-icon" />
              <div>
                <h3 class="business-page__benefit-title">
                  {{ t(`business.benefits.${benefit.key}.title`) }}
                </h3>
                <p class="business-page__benefit-text">
                  {{ t(`business.benefits.${benefit.key}.text`) }}
                </p>
              </div>
            </li>
          </ul>
        </section>
        <section class="business-page__soon" aria-labelledby="business-soon-title">
          <p class="business-page__badge">{{ t('business.soon.badge') }}</p>
          <h2 id="business-soon-title" class="business-page__soon-title">
            {{ t('business.soon.title') }}
          </h2>
          <p class="business-page__benefit-text">{{ t('business.soon.text') }}</p>
        </section>
        <section class="business-page__claim" aria-labelledby="business-claim-title">
          <h2 id="business-claim-title" class="business-page__soon-title">
            {{ t('business.claim.title') }}
          </h2>
          <NuxtLink to="/search" class="business-page__claim-link">
            {{ t('business.claim.action') }}
            <UiIcon name="i-hugeicons-arrow-right-01" :size="16" class="business-page__arrow" />
          </NuxtLink>
        </section>
      </div>
      <BusinessJoinForm class="business-page__form" />
    </div>
  </div>
</template>

<style scoped>
.business-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 24px var(--mp-gutter) var(--mp-section-gap);
  color: var(--mp-ink);
}

.business-page__hero {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-inline-size: 720px;
}

.business-page__eyebrow,
.business-page__badge {
  margin: 0;
  color: var(--mp-green);
  font-size: var(--mp-fs-label);
  font-weight: var(--mp-fw-bold);
  letter-spacing: var(--mp-ls-label);
  text-transform: uppercase;
}

.business-page__badge {
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  color: var(--mp-text-2);
}

.business-page__title {
  margin: 0;
  font-size: var(--mp-fs-h1);
  font-weight: var(--mp-fw-heavy);
  letter-spacing: var(--mp-ls-h1);
  line-height: 1.05;
}

.business-page__lead {
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body-lg);
}

.business-page__layout,
.business-page__content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.business-page__section-title {
  margin: 0 0 16px;
  font-size: var(--mp-fs-section-title);
  font-weight: var(--mp-fw-heavy);
  letter-spacing: var(--mp-ls-section-title);
}

.business-page__benefits {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.business-page__benefit {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.business-page__benefit-icon {
  color: var(--mp-coral);
}

.business-page__benefit-title,
.business-page__soon-title {
  margin: 0 0 4px;
  font-size: var(--mp-fs-body-lg);
  font-weight: var(--mp-fw-bold);
}

.business-page__benefit-text {
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body);
}

.business-page__soon {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  border-radius: var(--mp-r-panel-sm);
  background: var(--mp-skeleton);
}

.business-page__claim {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.business-page__claim-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  min-block-size: var(--mp-tap);
  color: var(--mp-ink);
  font-weight: var(--mp-fw-bold);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.business-page__claim-link:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

[dir='rtl'] .business-page__arrow {
  transform: scaleX(-1);
}

@media (min-width: 1200px) {
  .business-page {
    max-inline-size: var(--mp-container);
    margin-inline: auto;
    padding-inline: 0;
  }

  .business-page__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 420px);
    gap: 48px;
    align-items: start;
  }

  .business-page__form {
    position: sticky;
    inset-block-start: 16px;
  }
}
</style>
