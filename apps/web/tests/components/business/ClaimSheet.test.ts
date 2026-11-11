import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { SHEET_STUBS } from '../search/sheet-harness'
import { FORM_STUBS } from './form-stubs'

const PLACE_ID = '7b0c3f5e-9a55-4c63-8a51-3f8f7c1c2d4e'
const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: unknown) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
    locale: { value: 'en' },
  }),
}))
vi.stubGlobal('$fetch', mockFetch)

const ClaimSheet = (await import('~/app/components/business/ClaimSheet.vue')).default

const mountSheet = () =>
  mount(ClaimSheet, {
    props: { placeId: PLACE_ID, placeName: 'Science Museum', open: true },
    global: { stubs: { ...SHEET_STUBS, ...FORM_STUBS } },
  })

const submitButton = (wrapper: ReturnType<typeof mountSheet>) =>
  wrapper.get('button[type="submit"]')

async function fillValid(wrapper: ReturnType<typeof mountSheet>) {
  await wrapper.findAll('[role="radio"]')[0]!.trigger('click')
  await wrapper.get('[data-field="name"] input').setValue('Dana Levi')
  await wrapper.get('[data-field="email"] input').setValue('dana@museo.co.il')
  await wrapper.get('[data-field="phone"] input').setValue('03-123-4567')
  await wrapper.get('[data-turnstile]').trigger('click')
}

describe('BusinessClaimSheet', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('names the place in the description and offers the three roles', () => {
    const wrapper = mountSheet()
    expect(wrapper.get('[data-stub="UiSheet"]').attributes('data-title')).toBe('claim.title')
    expect(wrapper.findAll('[role="radio"]').map((radio) => radio.text())).toEqual([
      'claim.roles.owner',
      'claim.roles.manager',
      'claim.roles.employee',
    ])
  })

  it('links to the terms in a new tab', () => {
    const link = mountSheet().get('a[href="/terms"]')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.text()).toContain('detail.opensNewTab')
  })

  it('keeps submit disabled until the terms are accepted', async () => {
    const wrapper = mountSheet()
    await fillValid(wrapper)
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
    await wrapper.get('[data-terms]').setValue(true)
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('explains the missing acceptance after the terms are unticked', async () => {
    const wrapper = mountSheet()
    await wrapper.get('[data-terms]').setValue(true)
    await wrapper.get('[data-terms]').setValue(false)
    expect(wrapper.get('.claim-sheet__error').text()).toBe('validation.mustAccept')
  })

  it('sends the claim for the place and shows the confirmation', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const wrapper = mountSheet()
    await fillValid(wrapper)
    await wrapper.get('[data-terms]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mockFetch.mock.calls[0]![1].body).toEqual({
      kind: 'claim',
      placeId: PLACE_ID,
      role: 'owner',
      name: 'Dana Levi',
      email: 'dana@museo.co.il',
      phone: '03-123-4567',
      acceptTerms: true,
      locale: 'en',
      turnstileToken: 'token-1',
    })
    expect(wrapper.get('[role="status"]').text()).toContain('claim.thanks')
  })
})
