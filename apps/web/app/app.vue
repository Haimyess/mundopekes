<script setup lang="ts">
import { en, es, he, ru } from '@nuxt/ui/locale'

const NUXT_UI_LOCALES = { en, es, he, ru } as const

const { locale } = useI18n()
const baseUrl = useRuntimeConfig().public.i18n.baseUrl as string

const uiLocale = computed(
  () => NUXT_UI_LOCALES[locale.value as keyof typeof NUXT_UI_LOCALES] ?? NUXT_UI_LOCALES.he
)

const localeHead = useLocaleHead({ seo: { canonicalQueries: INDEXABLE_SEARCH_QUERIES } })

useHead(() => ({
  titleTemplate: brandTitle,
  htmlAttrs: localeHead.value.htmlAttrs,
  link: localeHead.value.link,
  meta: localeHead.value.meta,
}))

useSeoMeta({
  ogSiteName: SITE_NAME,
  ogType: 'website',
  ogImage: absoluteUrl(baseUrl, DEFAULT_SHARE_IMAGE_PATH),
  twitterCard: 'summary',
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
