import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { usePwaMode } from '~/app/composables/usePwaMode'

function mockMatchMedia(standaloneMatches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  const mql = {
    matches: standaloneMatches,
    media: '(display-mode: standalone)',
    addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb)
    }),
    removeEventListener: vi.fn(),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql)
  )
  // window.matchMedia is what the composable actually calls
  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia
  return { mql, fireChange: () => listeners.forEach((cb) => cb({} as MediaQueryListEvent)) }
}

// Mounting a host component is what actually triggers onMounted/onUnmounted
// for a composable that relies on lifecycle hooks — calling usePwaMode()
// bare (outside setup()) never fires onMounted.
function mountHost() {
  let result!: ReturnType<typeof usePwaMode>
  const Host = defineComponent({
    setup() {
      result = usePwaMode()
      return () => null
    },
  })
  const wrapper = mount(Host)
  return { wrapper, result }
}

describe('usePwaMode', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('isStandalone is false when display-mode: standalone does not match and no iOS flag', () => {
    mockMatchMedia(false)
    const { result } = mountHost()
    expect(result.isStandalone.value).toBe(false)
  })

  it('isStandalone is true when display-mode: standalone matches', () => {
    mockMatchMedia(true)
    const { result } = mountHost()
    expect(result.isStandalone.value).toBe(true)
  })

  it('falls back to navigator.standalone for legacy iOS Safari', () => {
    mockMatchMedia(false)
    Object.defineProperty(window.navigator, 'standalone', {
      configurable: true,
      value: true,
    })
    const { result } = mountHost()
    expect(result.isStandalone.value).toBe(true)
    // @ts-expect-error cleanup test-only property
    delete window.navigator.standalone
  })

  it('updates reactively when the media query change fires', async () => {
    const { fireChange } = mockMatchMedia(false)
    const { result } = mountHost()
    expect(result.isStandalone.value).toBe(false)

    // Flip what matchMedia reports, then simulate the browser's own change event
    window.matchMedia = vi.fn(() => ({
      matches: true,
      media: '(display-mode: standalone)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia
    fireChange()

    expect(result.isStandalone.value).toBe(true)
  })
})
