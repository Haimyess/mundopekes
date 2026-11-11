import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const { mockToast } = vi.hoisted(() => ({ mockToast: vi.fn() }))
const mockFetch = vi.fn()

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.stubGlobal('$fetch', mockFetch)
vi.mock('@nuxt/ui/composables/useToast', () => ({ useToast: () => ({ add: mockToast }) }))

const { useBusinessRequests } = await import('~/composables/useBusinessRequests')

describe('useBusinessRequests', () => {
  beforeEach(() => {
    mockFetch.mockReset().mockResolvedValue({ data: [{ id: 'a' }], count: 45, page: 1 })
    mockToast.mockReset()
  })

  it('loads pending requests first and counts the pages', async () => {
    const requests = useBusinessRequests()
    await requests.fetch()
    expect(mockFetch).toHaveBeenCalledWith('/api/business-requests', {
      params: { page: 1, limit: 20, kind: undefined, status: 'pending' },
    })
    expect(requests.requests.value).toEqual([{ id: 'a' }])
    expect(requests.totalPages.value).toBe(3)
    expect(requests.isLoading.value).toBe(false)
  })

  it('goes back to the first page when a filter changes', async () => {
    const requests = useBusinessRequests()
    await requests.fetch()
    requests.page.value = 3
    await nextTick()
    requests.kind.value = 'claim'
    await nextTick()
    expect(requests.page.value).toBe(1)
  })

  it('saves a review and reloads the list', async () => {
    const requests = useBusinessRequests()
    mockFetch.mockResolvedValueOnce({ id: 'a', status: 'approved' })
    await expect(requests.update('a', 'approved', 'ok')).resolves.toEqual({
      id: 'a',
      status: 'approved',
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/business-requests/a', {
      method: 'PATCH',
      body: { status: 'approved', notes: 'ok' },
    })
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('reports errors with a toast', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('offline')))
    const requests = useBusinessRequests()
    await requests.fetch()
    await expect(requests.update('a', 'rejected')).resolves.toBeNull()
    expect(mockToast).toHaveBeenCalledTimes(2)
    expect(mockToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ description: 'offline', color: 'error' })
    )
  })
})
