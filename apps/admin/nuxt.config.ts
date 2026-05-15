export default defineNuxtConfig({
  extends: ['../../layers/core', '../../layers/ui', '../../layers/domain'],

  modules: ['@vercel/analytics', '@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt', '@nuxtjs/supabase'],
  devtools: {
    enabled: true,
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    deeplApiKey: process.env.DEEPL_API_KEY ?? '',
    supabaseServiceKey: process.env.SUPABASE_SECRET_KEY ?? '',
    public: {
      supabaseUrl: process.env.SUPABASE_URL ?? '',
    },
  },
  routeRules: {
    '/api/**': {
      cors: true,
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
  supabase: {
    redirect: false,
    types: '~/types/database.types.ts',
  },
})

// // https://nuxt.com/docs/api/configuration/nuxt-config
// export default defineNuxtConfig({
//   // extends: [
//   //   '../../layers/core',
//   //   '../../layers/ui',
//   //   '../../layers/domain',
//   // ],
//   modules: [
//     '@nuxt/eslint',
//     '@nuxt/ui',
//     '@vueuse/nuxt',
//     '@nuxtjs/supabase'
//   ],
//   supabase: {
//     redirect: false,
//     types: '~/types/database.types.ts',
//   },

//   devtools: {
//     enabled: true
//   },

//   css: ['~/assets/css/main.css'],

//   routeRules: {
//     '/api/**': {
//       cors: true
//     }
//   },

//   compatibilityDate: '2024-07-11',

//   eslint: {
//     config: {
//       stylistic: {
//         commaDangle: 'never',
//         braceStyle: '1tbs'
//       }
//     }
//   }
// })
