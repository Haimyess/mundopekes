// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  extends: ['../../layers/core', '../../layers/ui', '../../layers/domain'],
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
      exclude: ['/*'],
    },
    // Fijado explícitamente (antes implícito por defaults del módulo) para que
    // la postura de seguridad de la cookie de sesión quede versionada.
    cookieOptions: {
      maxAge: 60 * 60 * 8,
      sameSite: 'lax',
      secure: true,
    },
  },

  // Forzar siempre Modo Claro — bloquea dark mode del OS en Android e iOS
  // Para revertir: cambiar preference/fallback a 'system' o eliminar este bloque
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: '',
  },

  // App Config
  app: {
    head: {
      title: 'MundoPekes - Actividades en familia con niños',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // Señal al browser: renderizar siempre en modo claro (Android + iOS)
        { name: 'color-scheme', content: 'light' },
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
    '@vercel/analytics',
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
    'nuxt-security',
  ],

  security: {
    headers: {
      // Default img-src es 'self' + data: — esta app carga fotos de Google
      // Places, tiles de Leaflet y storage de Supabase desde hosts externos.
      contentSecurityPolicy: {
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
    // Rate limiting propio (DB-backed, ver checkRateLimit) ya cubre los
    // endpoints públicos — el limiter en memoria del módulo sería redundante
    // y reintroduciría el mismo problema que se corrigió (no comparte estado
    // entre instancias serverless).
    rateLimiter: false,
    // Validador heurístico de XSS sobre query/body: no se probó contra los
    // formularios públicos reales (sugerencias, contacto) en un browser —
    // preferible sanitizar en los puntos de salida (ya hecho vía
    // escapeHtml()/sanitizeHttpUrl()) antes que arriesgar falsos positivos
    // bloqueando envíos legítimos el día del lanzamiento.
    xssValidator: false,
  },

  gtag: {
    id: process.env.NUXT_PUBLIC_GA4_ID,
    initCommands: [['consent', 'default', { analytics_storage: 'granted' }]],
  },

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
