import { defineVitestConfig } from '@nuxt/test-utils/config'
import { resolve } from 'node:path'

export default defineVitestConfig({
  resolve: {
    alias: {
      '#supabase/server': resolve(
        __dirname,
        '../../node_modules/@nuxtjs/supabase/dist/runtime/server/services/index.js'
      ),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.nuxt'],
  },
})
