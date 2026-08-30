import { translateI18nField } from '../../../../layers/domain/server/services/translation-service'

export {
  DeepLProvider,
  translateI18nField,
  translateSingleFieldInput,
} from '../../../../layers/domain/server/services/translation-service'
export type {
  TranslationProvider,
  FieldI18nStatus,
  LocaleStatusEntry,
  LocaleTranslationStatus,
} from '../../../../layers/domain/server/services/translation-service'

/**
 * Wrapper compatible hacia atrás sobre translateI18nField() para los ~7 call
 * sites existentes que sólo necesitan el texto traducido, no el status por
 * locale — ver layers/domain/server/services/translation-service.ts para la
 * API completa (usada directamente por los call sites que sí quieren
 * persistir i18n_status).
 */
export async function enrichI18nField(
  existing: Record<string, string>,
  apiKey: string,
  previous?: Record<string, string>,
  targetLocalesPool?: readonly string[]
): Promise<Record<string, string>> {
  const { value } = await translateI18nField({ existing, apiKey, previous, targetLocalesPool })
  return value
}
