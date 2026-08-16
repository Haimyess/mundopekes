export default defineNuxtConfig({
  extends: ['../../layers/core', '../../layers/ui', '../../layers/domain'],

  modules: [
    '@vercel/analytics',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
    '@nuxtjs/i18n',
    'nuxt-security',
  ],
  devtools: {
    enabled: true,
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    deeplApiKey: process.env.DEEPL_API_KEY ?? '',
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
    supabaseServiceKey: process.env.SUPABASE_SECRET_KEY ?? '',
    public: {
      supabaseUrl: process.env.SUPABASE_URL ?? '',
    },
  },
  future: {
    compatibilityVersion: 4,
  },
  compatibilityDate: '2024-07-11',
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs',
      },
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
    ],
    langDir: 'locales',
    defaultLocale: 'es',
    strategy: 'no_prefix',
  },
  security: {
    headers: {
      // Default img-src es 'self' + data: — el dashboard template trae
      // algunos avatares/og-images de hosts externos (github.com, ui.nuxt.com).
      contentSecurityPolicy: {
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
    // Ya tenemos rate limiting propio DB-backed (checkRateLimit) en los
    // endpoints que lo necesitan; el limiter en memoria del módulo sería
    // redundante y no comparte estado entre instancias serverless.
    rateLimiter: false,
    // Ver server/middleware/cors.ts — allowlist explícita ya implementada
    // ahí; el corsHandler del módulo (origin=self por defecto) es redundante
    // y podría pisar/duplicar esos headers.
    corsHandler: false,
    // Validador heurístico de XSS sobre query/body: no se probó contra los
    // formularios reales del admin en un browser — preferible sanitizar en
    // los puntos de salida (ya hecho vía escapeHtml()/sanitizeHttpUrl()).
    xssValidator: false,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SECRET_KEY,
    redirect: false,
    types: '~/types/database.types.ts',
    // Fijado explícitamente (antes implícito por defaults del módulo) para que
    // la postura de seguridad de la cookie de sesión quede versionada, no
    // dependiente de silenciosos cambios de default entre versiones.
    cookieOptions: {
      maxAge: 60 * 60 * 8,
      sameSite: 'lax',
      secure: true,
    },
  },
})
