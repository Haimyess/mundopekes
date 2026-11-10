import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { makeResultItem } from '../search/fixtures'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'en' },
    t: (key: string, params?: unknown) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}))
vi.mock('~/app/composables/useI18nContent', () => ({
  useI18nContent: () => ({ tc: (text: Record<string, string>) => text.en ?? '' }),
}))
vi.mock('../../../node_modules/nuxt/dist/app/composables/router.js', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useRouter: () => ({
    resolve: (location: { path: string; query: Record<string, string> }) => ({
      fullPath: `${location.path}?${decodeURIComponent(new URLSearchParams(location.query).toString())}`,
    }),
  }),
}))

const FamilySection = (await import('~/app/components/home/FamilySection.vue')).default

const NuxtLinkStub = defineComponent({
  name: 'NuxtLink',
  props: { to: { type: String, required: true } },
  setup:
    (props, { slots }) =>
    () =>
      h('a', { href: props.to }, slots.default?.()),
})
const SectionStub = defineComponent({
  name: 'HomeCarouselSection',
  props: { section: { type: Object, required: true } },
  setup: (props) => () =>
    h('div', { class: 'carousel', 'data-total': (props.section as { total: number }).total }),
})

const FAMILY = {
  ages: [3, 7],
  where: { kind: 'city' as const, slug: 'haifa' },
  when: { kind: 'shortcut' as const, shortcut: 'this-weekend' as const },
}

const mountSection = (results: unknown) =>
  mount(FamilySection, {
    props: { family: FAMILY, results },
    global: { stubs: { NuxtLink: NuxtLinkStub, HomeCarouselSection: SectionStub } },
  })

describe('HomeFamilySection', () => {
  it('summarizes the saved search and links to edit it', () => {
    const wrapper = mountSection({ items: [makeResultItem()], total: 6, occasion: null })
    expect(wrapper.find('h2').text()).toBe('family.title')
    expect(wrapper.findAll('.family-section__summary li').map((item) => item.text())).toEqual([
      'results.who.value:{"ages":"3 and 7"}',
      'Haifa',
      'results.when.this-weekend',
    ])
    expect(wrapper.find('a').attributes('href')).toBe(
      '/search?when=this-weekend&where=city:haifa&ages=3,7'
    )
    expect(wrapper.find('.carousel').attributes('data-total')).toBe('6')
  })

  it('explains when the saved search has no plans', () => {
    expect(
      mountSection({ items: [], total: 0, occasion: null }).find('[role="status"]').text()
    ).toBe('family.empty')
  })

  it('asks to forget the saved search', async () => {
    const wrapper = mountSection(null)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('forget')).toHaveLength(1)
  })
})
