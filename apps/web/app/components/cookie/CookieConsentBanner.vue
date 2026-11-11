<script setup lang="ts">
const { t } = useI18n()
const { hasDecided, acceptAll, acceptNecessaryOnly } = useCookieConsent()

const TITLE_ID = 'cookie-consent-title'
const DESCRIPTION_ID = 'cookie-consent-description'

const handleAcceptAll = () => acceptAll()
const handleAcceptNecessaryOnly = () => acceptNecessaryOnly()
</script>

<template>
  <section
    v-if="!hasDecided"
    class="cookie-consent"
    :aria-labelledby="TITLE_ID"
    :aria-describedby="DESCRIPTION_ID"
  >
    <div class="cookie-consent__body">
      <h2 :id="TITLE_ID" class="cookie-consent__title">{{ t('cookieConsent.title') }}</h2>
      <p :id="DESCRIPTION_ID" class="cookie-consent__description">
        {{ t('cookieConsent.description') }}
        <NuxtLinkLocale to="/privacy" class="cookie-consent__link">
          {{ t('cookieConsent.privacyLink') }}
        </NuxtLinkLocale>
      </p>
    </div>
    <div class="cookie-consent__actions">
      <UiButton
        variant="secondary"
        class="cookie-consent__action"
        data-test="consent-necessary"
        @click="handleAcceptNecessaryOnly"
      >
        {{ t('cookieConsent.necessaryOnly') }}
      </UiButton>
      <UiButton
        variant="secondary"
        class="cookie-consent__action"
        data-test="consent-all"
        @click="handleAcceptAll"
      >
        {{ t('cookieConsent.acceptAll') }}
      </UiButton>
    </div>
  </section>
</template>

<style scoped>
.cookie-consent {
  position: fixed;
  inset-inline: var(--space-4);
  inset-block-end: calc(var(--space-4) + env(safe-area-inset-bottom));
  z-index: var(--z-index-fixed);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: var(--container-md);
  margin-inline: auto;
  padding: var(--space-4) var(--space-5);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: var(--border-width-1) solid var(--color-neutral-300);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
}

.cookie-consent__title {
  margin: 0 0 var(--space-1);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.cookie-consent__description {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  color: var(--color-text-secondary);
}

.cookie-consent__link {
  color: var(--color-primary-700);
  text-decoration: underline;
}

.cookie-consent__link:focus-visible {
  outline: var(--border-width-2) solid var(--color-primary-700);
  outline-offset: var(--space-1);
}

.cookie-consent__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.cookie-consent__action {
  flex: 1 1 0;
  justify-content: center;
}

@media (min-width: 768px) {
  .cookie-consent {
    flex-direction: row;
    align-items: center;
  }

  .cookie-consent__actions {
    flex-wrap: nowrap;
  }
}
</style>
