// @ts-check
import { baseRules } from '@mundopekes/config/eslint/base'
import { vueRules } from '@mundopekes/config/eslint/vue'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    ...baseRules,
    ...vueRules,
    'vue/no-multiple-template-root': 'off',
    'vue/html-closing-bracket-newline': 'off',
    '@stylistic/quotes': ['error', 'single', { allowTemplateLiterals: 'always', avoidEscape: true }],
  },
})
