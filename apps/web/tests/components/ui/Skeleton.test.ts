import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiSkeleton from '../../../../../layers/ui/components/ui/Skeleton.vue'

describe('UiSkeleton', () => {
  it('is hidden from assistive technology', () => {
    expect(mount(UiSkeleton).attributes('aria-hidden')).toBe('true')
  })

  it('renders one bar per text line with a shorter last line', () => {
    const lines = mount(UiSkeleton, { props: { variant: 'text', lines: 3 } }).findAll(
      '.ui-skeleton'
    )
    expect(lines).toHaveLength(3)
    expect(lines[0]!.attributes('style')).toContain('inline-size: 100%')
    expect(lines[2]!.attributes('style')).toContain('inline-size: 60%')
  })

  it('keeps circles round', () => {
    const circle = mount(UiSkeleton, { props: { variant: 'circle', height: '48px' } })
    expect(circle.attributes('style')).toContain('inline-size: 48px')
    expect(circle.attributes('style')).toContain('block-size: 48px')
  })

  it('uses the requested block size', () => {
    const block = mount(UiSkeleton, { props: { width: '150px', height: '200px' } })
    expect(block.attributes('style')).toContain('inline-size: 150px')
    expect(block.attributes('style')).toContain('block-size: 200px')
  })
})
