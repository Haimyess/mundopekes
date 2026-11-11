import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { SHEET_STUBS } from '../search/sheet-harness'
import { TurnstileStub, widgetReset } from '../business/form-stubs'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))

const VerifiedSubmit = (await import('~/app/components/form/VerifiedSubmit.vue')).default
const Success = (await import('~/app/components/form/Success.vue')).default

const mountSubmit = (props: Record<string, unknown> = {}) =>
  mount(VerifiedSubmit, {
    props: { label: 'Enviar', failure: null, isSubmitting: false, canSubmit: false, ...props },
    global: { stubs: { ...SHEET_STUBS, SuggestionsTurnstileWidget: TurnstileStub } },
  })

describe('FormVerifiedSubmit', () => {
  it('stores the verification token in the model', async () => {
    const wrapper = mountSubmit()
    await wrapper.get('[data-turnstile]').trigger('click')
    expect(wrapper.emitted('update:token')).toEqual([['token-1']])
  })

  it.each(['expire', 'fail'])('drops the token when the challenge emits %s', (event) => {
    const wrapper = mountSubmit({ token: 'token-1' })
    wrapper.findComponent(TurnstileStub).vm.$emit(event)
    expect(wrapper.emitted('update:token')).toEqual([[null]])
  })

  it('disables the button until the form can be sent and shows its state', () => {
    expect(mountSubmit().get('button[type="submit"]').attributes('disabled')).toBeDefined()
    const ready = mountSubmit({ canSubmit: true, isSubmitting: true })
    expect(ready.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(ready.get('button[type="submit"]').attributes('data-loading')).toBe('true')
  })

  it('announces the failure and the optional note', () => {
    const wrapper = mountSubmit({ failure: 'verification', note: 'Te contactamos' })
    expect(wrapper.get('[role="alert"]').text()).toBe('forms.errors.verification')
    expect(wrapper.get('.form-verified-submit__note').text()).toBe('Te contactamos')
  })

  it('resets the challenge on demand', () => {
    widgetReset.mockReset()
    const wrapper = mountSubmit()
    ;(wrapper.vm as unknown as { reset: () => void }).reset()
    expect(widgetReset).toHaveBeenCalledOnce()
  })
})

describe('FormSuccess', () => {
  it('announces the message politely and renders actions', () => {
    const wrapper = mount(Success, {
      props: { message: 'Gracias' },
      slots: { default: '<button>Cerrar</button>' },
      global: { stubs: { UiIcon: true } },
    })
    expect(wrapper.get('[role="status"]').text()).toContain('Gracias')
    expect(wrapper.get('button').text()).toBe('Cerrar')
  })
})
