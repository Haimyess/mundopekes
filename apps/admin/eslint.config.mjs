// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/no-multiple-template-root': 'off',
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'vue/require-default-prop': 'warn',
    'vue/no-deprecated-v-on-native-modifier': 'warn',
    'no-empty': 'warn',
    'no-useless-escape': 'warn',
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
    'vue/html-closing-bracket-newline': 'off',
  },
})
