import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import stylistic from '@stylistic/eslint-plugin'
import { baseRules } from '@mundopekes/config/eslint/base'
import { vueRules } from '@mundopekes/config/eslint/vue'

export default createConfigForNuxt({
  features: { tooling: true },
}).append(
  {
    ignores: ['**/database.types.ts', '**/.nuxt/**', '**/node_modules/**', 'docs/design/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue', '**/*.js', '**/*.mjs', '**/*.cjs'],
    plugins: { '@stylistic': stylistic },
    rules: {
      ...baseRules,
      ...vueRules,
      'unicorn/prefer-number-properties': 'warn',
    },
  }
)
