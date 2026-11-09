import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { NuxtLinkStub, UIconStub } from './stubs'
import UiSectionHeader from '../../../../../layers/ui/components/ui/SectionHeader.vue'
import UiIcon from '../../../../../layers/ui/components/ui/Icon.vue'

const mountHeader = (props: Record<string, unknown>) =>
  mount(UiSectionHeader, {
    props,
    global: { stubs: { NuxtLink: NuxtLinkStub, UIcon: UIconStub }, components: { UiIcon } },
  })

describe('UiSectionHeader', () => {
  it('renders a level 2 heading by default', () => {
    const heading = mountHeader({ title: 'Este Shabat', headingId: 'shabat' }).find('h2')
    expect(heading.text()).toBe('Este Shabat')
    expect(heading.attributes('id')).toBe('shabat')
  })

  it('uses the requested heading level', () => {
    expect(mountHeader({ title: 'Horarios', level: 3 }).find('h3').exists()).toBe(true)
  })

  it('shows the action only when it has both a label and a destination', () => {
    expect(mountHeader({ title: 'x', actionLabel: 'Ver todo' }).find('a').exists()).toBe(false)
    const action = mountHeader({ title: 'x', actionLabel: 'Ver todo', actionTo: '/search' }).find(
      'a'
    )
    expect(action.attributes('href')).toBe('/search')
    expect(action.text()).toContain('Ver todo')
  })

  it('mirrors the action arrow in right-to-left', () => {
    const arrow = mountHeader({ title: 'x', actionLabel: 'Ver', actionTo: '/' }).find('[data-icon]')
    expect(arrow.classes()).toContain('ui-icon--mirror-rtl')
  })
})
