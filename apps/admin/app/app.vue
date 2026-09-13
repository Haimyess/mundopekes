<script setup lang="ts">
const colorMode = useColorMode()
const { t, locale } = useI18n()

// Compartido con layouts/default.vue: los clicks en los links del sidebar
// suprimen la barra de carga superior (redundante — cada página ya muestra
// su propio TableSkeleton al instante). Se resetea sola cuando termina la
// navegación, así que sigue funcionando normal para todo lo demás (ej. click
// en una fila de Places, que navega a /places/[id] y no tiene skeleton propio).
const hideLoadingIndicator = useState('hide-loading-indicator', () => false)
useNuxtApp().hook('page:loading:end', () => {
  hideLoadingIndicator.value = false
})

const color = computed(() => (colorMode.value === 'dark' ? '#1b1718' : 'white'))

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color },
  ],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: locale,
  },
})

const title = computed(() => t('seo.title'))
const description = computed(() => t('seo.description'))

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png',
  twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator v-if="!hideLoadingIndicator" />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
