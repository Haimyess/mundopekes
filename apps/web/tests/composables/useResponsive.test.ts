import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { MOBILE_FIRST_WIDTH, useResponsive } from '~/app/composables/useResponsive'

const ORIGINAL_WIDTH = window.innerWidth

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
}

const renderIsMobile = () => {
  const values: boolean[] = []
  const Probe = defineComponent({
    setup() {
      const { isMobile } = useResponsive()
      return () => {
        values.push(isMobile.value)
        return h('span')
      }
    },
  })
  mount(Probe)
  return values
}

describe('useResponsive', () => {
  afterEach(() => {
    setViewportWidth(ORIGINAL_WIDTH)
  })

  it('assumes a mobile viewport before mounting, like the server', () => {
    setViewportWidth(1440)
    expect(renderIsMobile()[0]).toBe(true)
    expect(MOBILE_FIRST_WIDTH).toBeLessThan(768)
  })

  it('switches to the real viewport once mounted', async () => {
    setViewportWidth(1440)
    const values = renderIsMobile()
    await nextTick()
    expect(values.at(-1)).toBe(false)
  })

  it('stays mobile on a real mobile viewport', async () => {
    setViewportWidth(390)
    const values = renderIsMobile()
    await nextTick()
    expect(values.at(-1)).toBe(true)
  })
})
