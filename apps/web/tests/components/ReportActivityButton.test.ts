import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { __resetStore } from '../__mocks__/nuxt-state'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.stubGlobal('useTracking', () => ({ trackContactSend: vi.fn() }))
vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({}))

const mockOpen = vi.fn()
vi.mock('~/app/composables/useContactForm', () => ({
  useContactForm: () => ({ open: mockOpen }),
}))

beforeEach(() => {
  __resetStore()
  mockOpen.mockClear()
})

const ReportActivityButton = (await import('~/app/components/activity/ReportActivityButton.vue'))
  .default

describe('ReportActivityButton', () => {
  it('renders a button in the DOM', () => {
    const wrapper = mount(ReportActivityButton, {
      props: { activityId: 'act-1', activityTitle: 'Parque Acuático' },
      global: {
        stubs: { UiButton: { template: '<button><slot /></button>' }, UiIcon: true },
      },
    })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('calls open() with intent outdated_activity on click', async () => {
    const wrapper = mount(ReportActivityButton, {
      props: { activityId: 'act-1', activityTitle: 'Parque Acuático' },
      global: {
        stubs: {
          UiButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          UiIcon: true,
        },
      },
    })
    await wrapper.find('button').trigger('click')
    expect(mockOpen).toHaveBeenCalledWith('outdated_activity', {
      activityId: 'act-1',
      activityTitle: 'Parque Acuático',
    })
  })

  it('passes activityId and activityTitle to open()', async () => {
    const wrapper = mount(ReportActivityButton, {
      props: { activityId: 'xyz-999', activityTitle: 'Museo de Ciencias' },
      global: {
        stubs: {
          UiButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          UiIcon: true,
        },
      },
    })
    await wrapper.find('button').trigger('click')
    expect(mockOpen).toHaveBeenCalledWith('outdated_activity', {
      activityId: 'xyz-999',
      activityTitle: 'Museo de Ciencias',
    })
  })
})
