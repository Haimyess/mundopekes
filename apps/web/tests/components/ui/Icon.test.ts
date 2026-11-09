import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { UIconStub } from './stubs'
import UiIcon from '../../../../../layers/ui/components/ui/Icon.vue'

const mountIcon = (props: Record<string, unknown>) =>
  mount(UiIcon, { props, global: { stubs: { UIcon: UIconStub } } })

describe('UiIcon', () => {
  it('is hidden from assistive technology by default', () => {
    const icon = mountIcon({ name: 'i-hugeicons-heart' }).find('span')
    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(icon.attributes('role')).toBeUndefined()
  })

  it('exposes an accessible name when labelled', () => {
    const icon = mountIcon({ name: 'i-hugeicons-heart', label: 'Favorito' }).find('span')
    expect(icon.attributes('role')).toBe('img')
    expect(icon.attributes('aria-label')).toBe('Favorito')
    expect(icon.attributes('aria-hidden')).toBeUndefined()
  })

  it.each([
    [14, '14px'],
    [40, '40px'],
    ['xs', '14px'],
    ['md', '20px'],
    ['2xl', '40px'],
  ])('maps size %s to %s', (size, pixels) => {
    const icon = mountIcon({ name: 'i-hugeicons-heart', size }).find('span')
    expect(icon.attributes('style')).toContain(`--ui-icon-size: ${pixels}`)
  })

  it('only mirrors in right-to-left when asked', () => {
    expect(mountIcon({ name: 'a' }).find('span').classes()).not.toContain('ui-icon--mirror-rtl')
    expect(mountIcon({ name: 'a', mirrorInRtl: true }).find('span').classes()).toContain(
      'ui-icon--mirror-rtl'
    )
  })
})
