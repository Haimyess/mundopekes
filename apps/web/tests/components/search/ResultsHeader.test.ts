import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string, count?: number) => `${key}:${count}` }),
}))

const ResultsHeader = (await import('~/app/components/search/ResultsHeader.vue')).default

describe('SearchResultsHeader', () => {
  it('renders the title as the page heading and announces the count', () => {
    const wrapper = mount(ResultsHeader, { props: { title: 'Parques', total: 12 } })
    expect(wrapper.find('h1').text()).toBe('Parques')
    const status = wrapper.find('[role="status"]')
    expect(status.attributes('aria-live')).toBe('polite')
    expect(status.text()).toBe('results.count:12')
  })

  it('keeps the live region empty while the total is unknown', () => {
    const wrapper = mount(ResultsHeader, { props: { title: 'Parques', total: null } })
    expect(wrapper.find('[role="status"]').text()).toBe('')
  })
})
