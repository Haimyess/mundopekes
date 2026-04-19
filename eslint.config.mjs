import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: { tooling: true },
}).append({
  ignores: ['**/database.types.ts'],
  files: ['**/layouts/**/*.vue', '**/components/Layout/**/*.vue'],
  rules: {
    'vue/multi-word-component-names': 'off',
  },
})
