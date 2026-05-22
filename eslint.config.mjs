import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import stylistic from '@stylistic/eslint-plugin'

export default createConfigForNuxt({
  features: { tooling: true }
}).append(
  {
    ignores: ['**/database.types.ts', '**/.nuxt/**', '**/node_modules/**']
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue', '**/*.js', '**/*.mjs', '**/*.cjs'],
    plugins: { '@stylistic': stylistic },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'warn',
      'vue/no-deprecated-v-on-native-modifier': 'warn',
      '@stylistic/max-statements-per-line': 'warn',
      '@stylistic/comma-dangle': 'off',
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
      'unicorn/prefer-number-properties': 'warn'
    }
  }
)
