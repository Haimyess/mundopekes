// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/no-multiple-template-root': 'off',
    'vue/max-attributes-per-line': ['error', { singleline: 3 }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'vue/multi-word-component-names': 'off',
    'vue/require-default-prop': 'warn',
    'vue/no-deprecated-v-on-native-modifier': 'warn',
    'no-empty': 'warn',
    'no-useless-escape': 'warn',
    '@stylistic/max-statements-per-line': 'warn',
    '@stylistic/comma-dangle': 'warn',
  },
})
