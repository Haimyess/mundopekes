<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <a href="#main-content" class="layout-header__skip">{{ t('layout.skipToContent') }}</a>
  <header class="layout-header">
    <div class="layout-header__bar">
      <NuxtLink to="/" class="layout-header__brand" :aria-label="t('layout.home')">
        <LayoutLogo />
      </NuxtLink>
      <div class="layout-header__actions">
        <NuxtLink to="/business" class="layout-header__business">
          {{ t('business.cta.header') }}
        </NuxtLink>
        <LayoutLanguageSheet />
        <NuxtLink to="/search" class="layout-header__icon-link" :aria-label="t('layout.search')">
          <UiIcon name="i-hugeicons-search-01" :size="24" />
        </NuxtLink>
      </div>
    </div>
    <LayoutCategoryNav />
  </header>
</template>

<style scoped>
.layout-header {
  background: var(--mp-surface);
  font-family: var(--mp-font);
}

.layout-header__skip {
  position: absolute;
  z-index: 100;
  inset-block-start: 8px;
  inset-inline-start: 8px;
  padding: 10px 16px;
  border-radius: var(--mp-r-btn);
  background: var(--mp-ink);
  color: var(--mp-surface);
  font-weight: var(--mp-fw-bold);
  transform: translateY(-200%);
}

.layout-header__skip:focus {
  transform: none;
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

.layout-header__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px var(--mp-gutter);
}

.layout-header__brand {
  border-radius: var(--mp-r-input);
  text-decoration: none;
}

.layout-header__brand:focus-visible,
.layout-header__business:focus-visible,
.layout-header__icon-link:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

.layout-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.layout-header__business {
  display: none;
  align-items: center;
  min-block-size: var(--mp-tap);
  padding-inline: 14px;
  border-radius: var(--mp-r-pill);
  color: var(--mp-ink);
  font-size: var(--mp-fs-body);
  font-weight: var(--mp-fw-semibold);
  text-decoration: none;
}

.layout-header__business:hover {
  text-decoration: underline;
}

.layout-header__icon-link {
  display: grid;
  place-items: center;
  inline-size: var(--mp-tap);
  block-size: var(--mp-tap);
  border-radius: var(--mp-r-pill);
  color: var(--mp-ink);
}

@media (min-width: 1200px) {
  .layout-header__business {
    display: inline-flex;
  }

  .layout-header__bar {
    max-inline-size: var(--mp-container);
    margin-inline: auto;
    padding: 20px 0;
  }
}
</style>
