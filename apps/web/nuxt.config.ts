// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // extends: [
  //   '../../layers/core',
  //   '../../layers/ui',
  //   '../../layers/domain',
  // ],
  runtimeConfig: {
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  devServer: {
    port: 4000,
    host: process.env.DEV_HOST || 'localhost',
  },

  // CSS Global
  css: [
    '~/assets/css/design-system.css',
    '~/assets/css/main.css',
    //  'leaflet/dist/leaflet.css'
  ],
  supabase: {
    types: './types/database.types.ts',
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/search', '/activity/*'],
    },
  },

  // App Config
  app: {
    head: {
      title: 'MundoPekes - Actividades en familia con niños',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Descubre las mejores actividades para hacer en familia con niños pequeños. Parques, museos, eventos y más.',
        },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },

  modules: [
    '@nuxtjs/leaflet',
    '@pinia/nuxt',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxtjs/i18n',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
    '@nuxt/ui',
    '@sentry/nuxt/module',
    'nuxt-gtag',
  ],

  gtag: {
    id: process.env.NUXT_PUBLIC_GA4_ID,
    initCommands: [['consent', 'default', { analytics_storage: 'granted' }]],
  },

  // @ts-expect-error — type augmentation from @sentry/nuxt/module requires nuxt prepare
  sentry: {
    sourceMapsUploadOptions: {
      org: 'huvi-ol',
      project: 'mundopekes-web',
    },
  },

  i18n: {
    locales: [
      {
        code: 'es',
        name: 'Español',
        file: 'es.json',
      },
      {
        code: 'en',
        name: 'English',
        file: 'en.json',
      },
      {
        code: 'ru',
        name: 'Русский',
        file: 'ru.json',
      },
      {
        code: 'he',
        name: 'עברית',
        file: 'he.json',
      },
    ],
    langDir: 'locales', // ← Ahora apunta a la raíz
    defaultLocale: 'he',
    strategy: 'no_prefix',
  },
})
