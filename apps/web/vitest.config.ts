import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.nuxt'],
  },
})
