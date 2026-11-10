import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, ref } from 'vue'
import { serializeWhen, type When } from '@mundopekes/core'

const currentWhen = ref<When | undefined>(undefined)

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/app/composables/useI18nContent', () => ({
  useI18nContent: () => ({ tc: (text: Record<string, string>) => text.es ?? '' }),
}))
vi.mock('~/app/composables/useSearchState', () => ({
  useSearchState: () => ({
    state: computed(() => ({ category: 'parques', when: currentWhen.value })),
    linkTo: (patch: { when?: When }) =>
      patch.when
        ? `/search?category=parques&when=${serializeWhen(patch.when)}`
        : '/search?category=parques',
  }),
}))

const UiChipStub = defineComponent({
  name: 'UiChip',
  props: { to: { type: String, required: true }, selected: Boolean },
  setup(props, { slots }) {
    return () =>
      h('a', { href: props.to, 'data-selected': String(props.selected) }, slots.default?.())
  },
})

const QuickChips = (await import('~/app/components/search/QuickChips.vue')).default

const HANUKKAH = {
  key: 'hanukkah',
  name: { es: 'Janucá' },
  startsOn: '2026-12-05',
  endsOn: '2026-12-12',
}

const mountChips = (occasion: typeof HANUKKAH | null = null) =>
  mount(QuickChips, { props: { occasion }, global: { stubs: { UiChip: UiChipStub } } })

describe('SearchQuickChips', () => {
  it('offers the date shortcuts keeping the other filters', () => {
    currentWhen.value = undefined
    const links = mountChips().findAll('a')
    expect(links.map((link) => link.text())).toEqual([
      'results.when.today',
      'results.when.tomorrow',
      'results.when.this-weekend',
      'results.when.shabat',
    ])
    expect(links[2]?.attributes('href')).toBe('/search?category=parques&when=this-weekend')
  })

  it('adds the upcoming occasion when there is one', () => {
    currentWhen.value = undefined
    const last = mountChips(HANUKKAH).findAll('a').at(-1)
    expect(last?.text()).toBe('Janucá')
    expect(last?.attributes('href')).toBe('/search?category=parques&when=occasion:hanukkah')
  })

  it('marks the selected shortcut and links it back to no date', () => {
    currentWhen.value = { kind: 'shortcut', shortcut: 'today' }
    const today = mountChips().find('a')
    expect(today.attributes('data-selected')).toBe('true')
    expect(today.attributes('href')).toBe('/search?category=parques')
  })

  it('labels the group', () => {
    expect(mountChips().find('ul').attributes('aria-label')).toBe('results.quickFilters')
  })
})
