import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { UIconStub } from './stubs'
import UiSheet from '../../../../../layers/ui/components/ui/Sheet.vue'
import UiIcon from '../../../../../layers/ui/components/ui/Icon.vue'

const received: { drawer?: Record<string, unknown>; popover?: Record<string, unknown> } = {}

const DrawerStub = defineComponent({
  name: 'UDrawer',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    return () => {
      received.drawer = { ...attrs }
      return h('div', { 'data-stub': 'drawer' }, [
        slots.default?.(),
        h('div', { 'data-slot': 'close' }, slots.close?.()),
        h('div', { 'data-slot': 'body' }, slots.body?.()),
        slots.footer ? h('div', { 'data-slot': 'footer' }, slots.footer()) : null,
      ])
    }
  },
})

const PopoverStub = defineComponent({
  name: 'UPopover',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    return () => {
      received.popover = { ...attrs }
      return h('div', { 'data-stub': 'popover' }, [
        slots.default?.(),
        h('div', { 'data-slot': 'content' }, slots.content?.()),
      ])
    }
  },
})

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

const mountSheet = (props: Record<string, unknown> = {}, slots: Record<string, string> = {}) =>
  mount(UiSheet, {
    props: { title: '¿Cuándo?', closeLabel: 'Cerrar', open: true, ...props },
    slots: {
      trigger: '<button type="button">Este finde</button>',
      default: '<p>Contenido</p>',
      ...slots,
    },
    global: {
      stubs: { UDrawer: DrawerStub, UPopover: PopoverStub, UIcon: UIconStub },
      components: { UiIcon },
    },
  })

describe('UiSheet', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    received.drawer = undefined
    received.popover = undefined
  })

  it('renders a bottom drawer first, the same on server and client', () => {
    stubMatchMedia(true)
    const wrapper = mountSheet()
    expect(wrapper.find('[data-stub="drawer"]').exists()).toBe(true)
    expect(received.drawer).toMatchObject({
      direction: 'bottom',
      title: '¿Cuándo?',
      dismissible: true,
    })
  })

  it('stays a drawer below 1200px', async () => {
    stubMatchMedia(false)
    const wrapper = mountSheet()
    await nextTick()
    expect(wrapper.find('[data-stub="drawer"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="body"]').text()).toBe('Contenido')
  })

  it('gives the drawer close button an accessible name', () => {
    stubMatchMedia(false)
    const close = mountSheet().find('[data-slot="close"] button')
    expect(close.attributes('aria-label')).toBe('Cerrar')
    expect(close.attributes('type')).toBe('button')
  })

  it('switches to a modal popover from 1200px', async () => {
    stubMatchMedia(true)
    const wrapper = mountSheet()
    await nextTick()
    expect(wrapper.find('[data-stub="popover"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="content"] h2').text()).toBe('¿Cuándo?')
    expect(received.popover).toMatchObject({ modal: true, dismissible: true })
  })

  it('closes the popover from its close button', async () => {
    stubMatchMedia(true)
    const wrapper = mountSheet()
    await nextTick()
    await wrapper.find('[data-slot="content"] button[aria-label="Cerrar"]').trigger('click')
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('keeps the trigger in both variants', async () => {
    stubMatchMedia(true)
    const wrapper = mountSheet()
    expect(wrapper.text()).toContain('Este finde')
    await nextTick()
    expect(wrapper.text()).toContain('Este finde')
  })

  it('renders the footer only when given', () => {
    stubMatchMedia(false)
    expect(mountSheet().find('[data-slot="footer"]').exists()).toBe(false)
    expect(
      mountSheet({}, { footer: '<button type="button">Aplicar</button>' })
        .find('[data-slot="footer"]')
        .text()
    ).toBe('Aplicar')
  })
})
