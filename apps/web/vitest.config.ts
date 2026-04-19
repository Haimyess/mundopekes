import { defineVitestConfig } from '@nuxt/test-utils/config'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const mockNuxtState: Plugin = {
  name: 'mock-nuxt-state',
  enforce: 'pre',
  resolveId(id) {
    if (id === '#imports') {
      return resolve(__dirname, 'tests/__mocks__/nuxt-imports.ts')
    }
    if (id.includes('composables/state')) {
      return resolve(__dirname, 'tests/__mocks__/nuxt-state.ts')
    }
  },
}

export default defineVitestConfig({
  plugins: [mockNuxtState],
  resolve: {
    alias: {
      '#supabase/server': resolve(
        __dirname,
        '../../node_modules/@nuxtjs/supabase/dist/runtime/server/services/index.js'
      ),
      '~': resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.nuxt'],
  },
})
