import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const TOKENS_CSS = readFileSync(
  resolve(__dirname, '../../../../layers/ui/assets/css/tokens.css'),
  'utf8'
)

const HANDOFF_TOKENS: Record<string, string> = {
  '--mp-ink': '#111111',
  '--mp-text-2': '#4a4a4a',
  '--mp-text-3': '#6b6b6b',
  '--mp-border-soft': '#e6e6e6',
  '--mp-border': '#dadada',
  '--mp-skeleton': '#f2f1ef',
  '--mp-coral': '#e8412f',
  '--mp-coral-50': '#ffe9e5',
  '--mp-coral-700': '#c7362b',
  '--mp-discount-text': '#a82a21',
  '--mp-green': '#0f7b45',
  '--mp-blue': '#1f6fd1',
  '--mp-r-input': '12px',
  '--mp-r-btn': '14px',
  '--mp-r-card': '18px',
  '--mp-r-sheet': '28px',
  '--mp-r-pill': '999px',
  '--mp-gutter': '16px',
  '--mp-container': '1200px',
  '--mp-section-gap': '48px',
  '--mp-tap': '44px',
  '--mp-focus-ring-width': '3px',
}

const declarationsIn = (css: string) =>
  Object.fromEntries(
    [...css.matchAll(/(--mp-[a-z0-9-]+):\s*([^;\s][^;]*);/g)].map(([, name, value]) => [
      name,
      value!.trim(),
    ])
  )

const rootBlocks = TOKENS_CSS.split('@media')[0]!
const desktopBlock = TOKENS_CSS.slice(TOKENS_CSS.indexOf('@media (min-width: 1200px)'))

describe('design tokens', () => {
  const tokens = declarationsIn(rootBlocks)

  it.each(Object.entries(HANDOFF_TOKENS))('defines %s as in the handoff', (name, value) => {
    expect(tokens[name]?.toLowerCase()).toBe(value)
  })

  it('uses Albert Sans by default and Heebo for right-to-left pages', () => {
    expect(tokens['--mp-font-latin']).toMatch(/^'Albert Sans'/)
    expect(tokens['--mp-font-he']).toMatch(/^'Heebo'/)
    expect(TOKENS_CSS).toMatch(/\[dir='rtl'\]\s*\{\s*--mp-font:\s*var\(--mp-font-he\);/)
  })

  it('uses Onest for Russian, which Albert Sans cannot render', () => {
    expect(tokens['--mp-font-ru']).toMatch(/^'Onest'/)
    expect(TOKENS_CSS).toMatch(/:root:lang\(ru\)\s*\{\s*--mp-font:\s*var\(--mp-font-ru\);/)
  })

  it('keeps the logo in Albert Sans in every language', () => {
    expect(tokens['--mp-font-logo']).toBe('var(--mp-font-latin)')
  })

  it('scales headings up from 1200px', () => {
    expect(tokens['--mp-fs-h1']).toBe('32px')
    expect(declarationsIn(desktopBlock)).toMatchObject({
      '--mp-fs-h1': '56px',
      '--mp-fs-detail-title': '40px',
      '--mp-fs-section-title': '30px',
    })
  })

  it('only offers the icon sizes allowed by the design', () => {
    const iconSizes = Object.entries(tokens)
      .filter(([name]) => name.startsWith('--mp-icon-'))
      .map(([, value]) => value)
    expect(iconSizes).toEqual(['14px', '16px', '20px', '24px', '32px', '40px'])
  })
})
