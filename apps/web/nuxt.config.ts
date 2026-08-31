import { CONTENT_LOCALE_META } from '../../layers/domain/config/locales'

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
    '~/assets/css/pwa.css',
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
        // viewport-fit=cover: sin esto env(safe-area-inset-*) siempre da 0,
        // aunque el dispositivo tenga notch/home-indicator (ver pwa.css).
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        // Señal al browser: renderizar siempre en modo claro (Android + iOS)
        { name: 'color-scheme', content: 'light' },
        // Color de la barra de estado/URL cuando la PWA corre instalada
        // (standalone) — mismo valor que theme_color del manifest.
        { name: 'theme-color', content: '#00a896' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        {
          name: 'description',
          content:
            'Descubre las mejores actividades para hacer en familia con niños pequeños. Parques, museos, eventos y más.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/pwa-icons/apple-touch-icon.png' },
      ],
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
    '@vite-pwa/nuxt',
  ],

  // PWA: manifest + service worker (Workbox generateSW vía @vite-pwa/nuxt).
  // Alcance deliberadamente acotado a app-shell + caché de imágenes — sin
  // offline completo, sin push, sin background sync (no hay necesidad hoy).
  // Íconos en public/pwa-icons/ son un placeholder geométrico (ver el propio
  // SVG fuente) hasta que exista un ícono de marca cuadrado definitivo.
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'MundoPekes - Actividades en familia',
      short_name: 'MundoPekes',
      description: 'Descubre las mejores actividades para hacer en familia con niños pequeños.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#00a896',
      icons: [
        { src: '/pwa-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        {
          src: '/pwa-icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      // App-shell + imágenes solamente — el resto de las llamadas (Supabase,
      // Google Places, /api/*) van directo a red, sin caché, para no servir
      // datos desactualizados como si fueran resultados reales.
      globPatterns: ['**/*.{js,css,html}'],
      navigateFallback: '/',
      runtimeCaching: [
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif)$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'mp-images',
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    devOptions: {
      // Desactivado en dev por defecto: probar el modo standalone se hace
      // vía "Emulate CSS media feature: display-mode" en Chrome DevTools
      // (ver Verificación end-to-end del plan), sin necesitar el SW activo
      // y sin arriesgar interferencia con la HMR de Nuxt.
      enabled: false,
    },
  },

  security: {
    headers: {
      // Default img-src es 'self' + data: — esta app carga fotos de Google
      // Places, tiles de Leaflet y storage de Supabase desde hosts externos.
      contentSecurityPolicy: {
        'img-src': ["'self'", 'data:', 'https:'],
        // Sin esto el navegador bloquea silenciosamente el registro del
        // service worker del módulo PWA (falla sin error visible en consola
        // en algunos navegadores) — el riesgo más alto de "funciona en
        // local, se rompe en producción" de todo el plan PWA.
        'worker-src': ["'self'"],
      },
      // nuxt-security bloquea geolocation por defecto (Permissions-Policy:
      // geolocation=()), lo que impide que el navegador muestre el prompt
      // de "compartir ubicación" para el carrusel "Cerca de ti". Se habilita
      // solo para same-origin.
      permissionsPolicy: {
        geolocation: ['self'],
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
    // Locales de contenido (name_i18n/description_i18n/etc.) y de interfaz de
    // esta app coinciden 1:1 — CONTENT_LOCALE_META es la fuente única, ver
    // layers/domain/config/locales.ts.
    locales: [...CONTENT_LOCALE_META],
    langDir: 'locales', // ← Ahora apunta a la raíz
    defaultLocale: 'he',
    strategy: 'no_prefix',
  },
})
