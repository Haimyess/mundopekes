<script setup lang="ts">
import type { ContentLocale } from '@mundopekes/i18n'

const { t } = useI18n()
const { locales, currentLocale, switchLocale } = useLanguageSwitch()

const isOpen = ref(false)

const handleSelect = async (code: ContentLocale) => {
  await switchLocale(code)
  isOpen.value = false
}
</script>

<template>
  <UiSheet
    v-model:open="isOpen"
    :title="t('layout.languageTitle')"
    :close-label="t('layout.close')"
  >
    <template #trigger>
      <button type="button" class="language-sheet__trigger" :aria-label="t('layout.language')">
        <UiIcon name="i-hugeicons-globe-02" :size="20" />
        <span class="language-sheet__code" aria-hidden="true">{{
          currentLocale.toUpperCase()
        }}</span>
      </button>
    </template>
    <ul class="language-sheet__list">
      <li v-for="language in locales" :key="language.code">
        <button
          type="button"
          class="language-sheet__option"
          :lang="language.code"
          :aria-current="language.code === currentLocale ? 'true' : undefined"
          @click="handleSelect(language.code)"
        >
          <span>{{ language.name }}</span>
          <UiIcon v-if="language.code === currentLocale" name="i-hugeicons-tick-02" :size="20" />
        </button>
      </li>
    </ul>
  </UiSheet>
</template>

<style scoped>
.language-sheet__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-block-size: var(--mp-tap);
  padding-inline: 12px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  color: var(--mp-ink);
  font: inherit;
  font-size: var(--mp-fs-body);
  font-weight: var(--mp-fw-bold);
  cursor: pointer;
}

.language-sheet__trigger:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

.language-sheet__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.language-sheet__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  inline-size: 100%;
  min-block-size: 52px;
  padding-inline: 4px;
  border: 0;
  border-block-end: 1px solid var(--mp-border-soft);
  background: transparent;
  color: var(--mp-ink);
  font: inherit;
  font-size: var(--mp-fs-body-lg);
  font-weight: var(--mp-fw-semibold);
  text-align: start;
  cursor: pointer;
}

.language-sheet__option[aria-current='true'] {
  font-weight: var(--mp-fw-heavy);
}

.language-sheet__option:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: -3px;
}
</style>
