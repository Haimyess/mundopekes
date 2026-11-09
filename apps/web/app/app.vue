<script setup lang="ts">
import { en, es, he, ru } from '@nuxt/ui/locale'

const NUXT_UI_LOCALES = { en, es, he, ru } as const

const { locale } = useI18n()

const uiLocale = computed(
  () => NUXT_UI_LOCALES[locale.value as keyof typeof NUXT_UI_LOCALES] ?? NUXT_UI_LOCALES.he
)

useHead({
  htmlAttrs: {
    dir: computed(() => (locale.value === 'he' ? 'rtl' : 'ltr')),
    lang: computed(() => locale.value),
  },
})
</script>

<template>
  <UApp :locale="uiLocale">
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <CookieConsentBanner />
  </UApp>
</template>
