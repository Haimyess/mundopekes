import type { ContentLocale } from './locales'

export type PluralRule = (choice: number, choicesLength: number) => number

const FEW_INDEX = 2
const MANY_INDEX = 3

export const russianPluralRule: PluralRule = (choice, choicesLength) => {
  if (choice === 0) return 0
  const lastDigit = choice % 10
  const lastTwoDigits = choice % 100
  const isTeen = lastTwoDigits > 10 && lastTwoDigits < 20
  if (!isTeen && lastDigit === 1) return 1
  if (!isTeen && lastDigit >= 2 && lastDigit <= 4) return FEW_INDEX
  return choicesLength < 4 ? FEW_INDEX : MANY_INDEX
}

export const PLURAL_RULES: Partial<Record<ContentLocale, PluralRule>> = {
  ru: russianPluralRule,
}
