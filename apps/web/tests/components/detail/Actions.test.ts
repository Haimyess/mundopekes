import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const { mockTrackDirections } = vi.hoisted(() => ({ mockTrackDirections: vi.fn() }))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'en' },
    t: (key: string, params?: unknown) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}))
vi.mock('~/app/composables/useTracking', () => ({
  useTracking: () => ({ trackDirectionsClick: mockTrackDirections }),
}))

const QuickActions = (await import('~/app/components/detail/QuickActions.vue')).default
const ActionBar = (await import('~/app/components/detail/ActionBar.vue')).default

const CONTACT = {
  phone: '03-627 3927',
  website: 'https://park.co.il/',
  whatsappUrl: null,
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=32.1,34.8',
  wazeUrl: 'https://waze.com/ul?ll=32.1,34.8&navigate=yes',
}

function mountWith(component: typeof QuickActions, contact = CONTACT) {
  const wrapper = mount(component, {
    props: { contact, targetType: 'place', targetId: 'p1' },
    global: { stubs: { UiIcon: true } },
  })
  wrapper.element.addEventListener?.('click', (event: Event) => event.preventDefault())
  return wrapper
}

describe('DetailQuickActions', () => {
  it('offers only the actions that have data, inside a labelled navigation', () => {
    const wrapper = mountWith(QuickActions)
    expect(wrapper.find('nav').attributes('aria-label')).toBe('detail.quickActions')
    expect(wrapper.findAll('a').map((link) => link.attributes('href'))).toEqual([
      CONTACT.directionsUrl,
      CONTACT.wazeUrl,
      'tel:036273927',
      CONTACT.website,
    ])
  })

  it('opens external links safely and announces the new tab', () => {
    const [directions, , call] = mountWith(QuickActions).findAll('a')
    expect(directions!.attributes()).toMatchObject({ target: '_blank', rel: 'noopener noreferrer' })
    expect(directions!.find('.quick-actions__hint').text()).toBe('detail.opensNewTab')
    expect(call!.attributes('target')).toBeUndefined()
  })

  it('tracks directions by provider', async () => {
    const links = mountWith(QuickActions).findAll('a')
    await links[0]!.trigger('click')
    await links[1]!.trigger('click')
    await links[2]!.trigger('click')
    expect(mockTrackDirections.mock.calls).toEqual([
      ['place', 'p1', 'maps'],
      ['place', 'p1', 'waze'],
    ])
  })

  it('renders nothing without contact data', () => {
    const empty = { ...CONTACT, phone: null, website: null, directionsUrl: null, wazeUrl: null }
    expect(mountWith(QuickActions, empty).find('nav').exists()).toBe(false)
  })
})

describe('DetailActionBar', () => {
  it('keeps directions and call at hand', () => {
    const links = mountWith(ActionBar).findAll('a')
    expect(links.map((link) => link.attributes('href'))).toEqual([
      CONTACT.directionsUrl,
      'tel:036273927',
    ])
  })

  it('disappears without directions or phone', () => {
    const empty = { ...CONTACT, phone: null, directionsUrl: null }
    expect(mountWith(ActionBar, empty).find('.detail-action-bar').exists()).toBe(false)
  })
})
