import type { When } from '@mundopekes/core'
import type { SearchOccasion } from '#shared/types/search'
import type { SearchState } from '~/utils/search-query'

export function useSearchLabels() {
  const { t, locale } = useI18n()
  const { tc } = useI18nContent()

  function whenLabel(when: When | undefined, occasion: SearchOccasion | null): string | undefined {
    if (!when) return undefined
    if (when.kind === 'shortcut') return t(`results.when.${when.shortcut}`)
    if (when.kind === 'occasion') {
      return occasion?.key === when.key ? tc(occasion.name) : t('results.when.occasion')
    }
    const from = formatIsoDate(when.range.from, locale.value)
    return when.range.from === when.range.to
      ? from
      : `${from} – ${formatIsoDate(when.range.to, locale.value)}`
  }

  function agesLabel(ages: readonly number[] | undefined): string | undefined {
    if (!ages?.length) return undefined
    const list = new Intl.ListFormat(locale.value, { type: 'conjunction' }).format(ages.map(String))
    return t('results.who.value', { ages: list })
  }

  function activeFilterCount(state: SearchState): number {
    return (
      Number(!!state.kind) +
      Number(!!state.free) +
      Number(!!state.open) +
      Number(!!state.price) +
      (state.amenities?.length ?? 0) +
      (state.discounts?.length ?? 0)
    )
  }

  return { whenLabel, agesLabel, activeFilterCount }
}
