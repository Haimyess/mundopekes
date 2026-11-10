import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const cookie = ref<unknown>(null)
const cookieOptions: Record<string, unknown>[] = []

vi.mock('../../node_modules/nuxt/dist/app/composables/cookie.js', () => ({
  useCookie: (_name: string, options: Record<string, unknown>) => {
    cookieOptions.push(options)
    return cookie
  },
}))

const { hasFamilyCriteria, useFamily } = await import('~/app/composables/useFamily')

describe('useFamily', () => {
  beforeEach(() => {
    cookie.value = null
  })

  it('stores the search in a year-long lax cookie', () => {
    const { save, family } = useFamily()
    save({ ages: [4], where: { kind: 'city', slug: 'haifa' }, sort: 'price' })
    expect(cookieOptions.at(-1)).toMatchObject({ sameSite: 'lax', maxAge: 31536000 })
    expect(cookie.value).toMatchObject({ v: 1, ages: [[4, 4]], city: 'haifa' })
    expect(family.value).toMatchObject({ ages: [4], where: { kind: 'city', slug: 'haifa' } })
  })

  it('ignores tampered cookies', () => {
    cookie.value = { v: 1, ages: 'all', savedAt: 'yesterday' }
    expect(useFamily().family.value).toBeNull()
  })

  it('compares searches ignoring sort, page, view, text and exact positions', () => {
    const { save, isSaved } = useFamily()
    save({ ages: [4], when: { kind: 'shortcut', shortcut: 'today' } })
    expect(
      isSaved({
        ages: [4],
        when: { kind: 'shortcut', shortcut: 'today' },
        sort: 'price',
        page: 2,
        view: 'map',
      })
    ).toBe(true)
    expect(isSaved({ ages: [5], when: { kind: 'shortcut', shortcut: 'today' } })).toBe(false)
  })

  it('forgets the saved search', () => {
    const { save, clear, family } = useFamily()
    save({ ages: [2] })
    clear()
    expect(cookie.value).toBeNull()
    expect(family.value).toBeNull()
  })
})

describe('hasFamilyCriteria', () => {
  it('asks to save only searches with ages, a city or a date', () => {
    expect(hasFamilyCriteria({ ages: [3] })).toBe(true)
    expect(hasFamilyCriteria({ where: { kind: 'city', slug: 'haifa' } })).toBe(true)
    expect(hasFamilyCriteria({ where: { kind: 'point', point: { lat: 32, lng: 34.8 } } })).toBe(
      false
    )
    expect(hasFamilyCriteria({ category: 'parques', free: true })).toBe(false)
  })
})
