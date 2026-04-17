/**
 * Composable para convertir age_ranges (en meses) a texto legible.
 *
 * Con el nuevo schema, una actividad tiene un array de AgeRange (join de tablas).
 * El composable calcula el rango global: min del menor, max del mayor.
 *
 * Ejemplos con array:
 *   [{ min_months: 0, max_months: 12 }]              → "0 – 12 months"
 *   [{ min_months: 6, max_months: 48 }]              → "6 months – 4 years"
 *   [{ min_months: 0, max_months: 36 },
 *    { min_months: 36, max_months: 144 }]            → "0 – 12 years"
 */

import type { AgeRange } from '~/types'

export const useAgeRange = () => {
  const { t } = useI18n()

  /**
   * Convierte meses a texto legible.
   * < 12 meses → muestra en meses
   * >= 12 meses → muestra en años (con meses restantes si los hay)
   */
  const formatAge = (months: number): string => {
    if (months === 0) return t('age.months', { count: 0 })
    if (months < 12) return t('age.months', { count: months })
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    if (remainingMonths === 0) return t('age.years', { count: years })
    return t('age.years_months', { years, months: remainingMonths })
  }

  /**
   * Formatea un array de AgeRange del join de Supabase.
   * Calcula el rango global: el min más bajo y el max más alto.
   *
   * [{ min_months: 6, max_months: 48 }] → "6 months – 4 years"
   */
  const formatAgeRange = (ranges: AgeRange[]): string => {
    if (!ranges?.length) return t('age.all_ages')

    const globalMin = Math.min(...ranges.map(r => r.min_months))
    const globalMax = Math.max(...ranges.map(r => r.max_months))

    return `${formatAge(globalMin)} – ${formatAge(globalMax)}`
  }

  /**
   * Versión corta para badges/cards.
   * [{ min_months: 6, max_months: 48 }] → "6m – 4y"
   */
  const formatAgeRangeShort = (ranges: AgeRange[]): string => {
    if (!ranges?.length) return '—'

    const formatShort = (months: number): string => {
      if (months < 12) return `${months}${t('age.short_months')}`
      const years = Math.floor(months / 12)
      return `${years}${t('age.short_years')}`
    }

    const globalMin = Math.min(...ranges.map(r => r.min_months))
    const globalMax = Math.max(...ranges.map(r => r.max_months))

    return `${formatShort(globalMin)} – ${formatShort(globalMax)}`
  }

  /**
   * Lista todos los rangos individuales con su label_key traducido.
   * Útil para mostrar chips/badges de cada rango por separado.
   *
   * [{ label_key: 'age.baby', min_months: 0, max_months: 12 }]
   * → [{ label: 'Baby', range: '0 – 12 months' }]
   */
  const formatAgeRangeList = (ranges: AgeRange[]) => {
    if (!ranges?.length) return []

    return ranges.map(r => ({
      id: r.id,
      label: r.label_key ? t(r.label_key) : formatAgeRange([r]),
      range: formatAgeRange([r])
    }))
  }

  return {
    formatAge,
    formatAgeRange,
    formatAgeRangeShort,
    formatAgeRangeList
  }
}