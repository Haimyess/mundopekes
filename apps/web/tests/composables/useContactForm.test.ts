import { describe, it, expect, vi, beforeEach } from 'vitest'
import { __resetStore } from '../__mocks__/nuxt-state'
import { useContactForm } from '~/app/composables/useContactForm'

vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({}))
vi.stubGlobal('useAnalytics', () => ({ trackContactFormSend: vi.fn() }))

beforeEach(() => {
  __resetStore()
})

describe('useContactForm', () => {
  it('open() sets isOpen to true', () => {
    const { isOpen, open } = useContactForm()
    expect(isOpen.value).toBe(false)
    open()
    expect(isOpen.value).toBe(true)
  })

  it('open() with prefill sets prefillActivityId correctly', () => {
    const { prefillActivityId, open } = useContactForm()
    open('feedback', { activityId: 'abc-123', activityTitle: 'Parque' })
    expect(prefillActivityId.value).toBe('abc-123')
  })

  it('close() resets isOpen to false', () => {
    const { isOpen, open, close } = useContactForm()
    open()
    expect(isOpen.value).toBe(true)
    close()
    expect(isOpen.value).toBe(false)
  })
})
