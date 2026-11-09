import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { useHydrationSafeMediaQuery } from '../../../../layers/ui/composables/useHydrationSafeMediaQuery'

const stubMatchMedia = (matches: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) => ({
      matches,
      media,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))
  )
}

const renderValues = (query: string, options?: { ssrValue?: boolean }) => {
  const values: boolean[] = []
  const Probe = defineComponent({
    setup() {
      const matches = useHydrationSafeMediaQuery(query, options)
      return () => {
        values.push(matches.value)
        return h('span', String(matches.value))
      }
    },
  })
  mount(Probe)
  return values
}

describe('useHydrationSafeMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the server value first even when the query matches', async () => {
    stubMatchMedia(true)
    const values = renderValues('(min-width: 768px)')
    expect(values[0]).toBe(false)
    await nextTick()
    expect(values.at(-1)).toBe(true)
  })

  it('uses the provided server value until mounted', async () => {
    stubMatchMedia(false)
    const values = renderValues('(max-width: 767px)', { ssrValue: true })
    expect(values[0]).toBe(true)
    await nextTick()
    expect(values.at(-1)).toBe(false)
  })

  it('keeps a single render when the real value equals the server value', async () => {
    stubMatchMedia(false)
    const values = renderValues('(min-width: 768px)')
    await nextTick()
    expect(values).toEqual([false])
  })
})
