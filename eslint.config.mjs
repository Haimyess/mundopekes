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
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
      'unicorn/prefer-number-properties': 'warn',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/arrow-parens': 'off',
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/member-delimiter-style': 'off',
      '@stylistic/quote-props': 'off',
      '@stylistic/max-statements-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/comma-dangle': 'off',
      'vue/html-indent': 'off',
      'vue/operator-linebreak': 'off',
      'vue/max-attributes-per-line': 'off',
    }
  }
)