import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { SHEET_STUBS } from '../search/sheet-harness'
import { FORM_STUBS, widgetReset } from './form-stubs'

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: unknown) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
    locale: { value: 'he' },
  }),
}))
vi.stubGlobal('$fetch', mockFetch)

const JoinForm = (await import('~/app/components/business/JoinForm.vue')).default

const mountForm = () => mount(JoinForm, { global: { stubs: { ...SHEET_STUBS, ...FORM_STUBS } } })

async function fillValid(wrapper: ReturnType<typeof mountForm>) {
  await wrapper.get('[data-field="businessName"] input').setValue('Taller Barro y Color')
  await wrapper.get('[data-field="activityType"] input').setValue('Taller')
  await wrapper.get('[data-field="city"] input').setValue('Tel Aviv')
  await wrapper.get('[data-field="phone"] input').setValue('+972 50 123 4567')
  await wrapper.get('[data-turnstile]').trigger('click')
}

describe('BusinessJoinForm', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    widgetReset.mockReset()
  })

  it('labels the section and renders the four required fields', () => {
    const wrapper = mountForm()
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe('business-join-title')
    expect(wrapper.findAll('[data-field]').map((field) => field.attributes('data-field'))).toEqual([
      'businessName',
      'activityType',
      'city',
      'phone',
    ])
    expect(wrapper.get('[data-field="phone"] input').attributes('type')).toBe('tel')
  })

  it('shows the phone error live after leaving the field', async () => {
    const wrapper = mountForm()
    await wrapper.get('[data-field="phone"] input').setValue('123')
    await wrapper.get('[data-field="phone"] input').trigger('blur')
    expect(wrapper.get('[data-field="phone"]').attributes('data-error')).toContain(
      'validation.invalidPhone'
    )
  })

  it('sends a join request and thanks the business', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    const wrapper = mountForm()
    await fillValid(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mockFetch).toHaveBeenCalledWith('/api/business-requests', {
      method: 'POST',
      body: {
        kind: 'join',
        businessName: 'Taller Barro y Color',
        activityType: 'Taller',
        city: 'Tel Aviv',
        phone: '+972 50 123 4567',
        locale: 'he',
        turnstileToken: 'token-1',
      },
    })
    expect(wrapper.get('[role="status"]').text()).toContain('business.join.thanks')
  })

  it('resets the verification after a failed request', async () => {
    mockFetch.mockImplementation(() =>
      Promise.reject(Object.assign(new Error('down'), { statusCode: 500 }))
    )
    const wrapper = mountForm()
    await fillValid(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('forms.errors.generic')
    expect(widgetReset).toHaveBeenCalledOnce()
  })
})
