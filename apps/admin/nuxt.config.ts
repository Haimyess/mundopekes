// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: [                    // ← agregar esto
    '../../layers/core',        // ← agregar esto
    '../../layers/ui',          // ← agregar esto
    '../../layers/domain',      // ← agregar esto
  ],   
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxtjs/supabase'
  ],
  supabase: {
    redirect: false,
    types: '~/types/database.types.ts',
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
