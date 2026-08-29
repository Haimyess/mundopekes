import { getConfiguredLocales } from '../utils/get-configured-locales'
import type {
  FieldI18nStatus,
  LocaleStatusEntry,
  LocaleTranslationStatus,
} from '../../types/i18n-status'

export type { FieldI18nStatus, LocaleStatusEntry, LocaleTranslationStatus }

// Translation abstraction: `TranslationProvider` es la interfaz swappeable,
// `DeepLProvider` es la única implementación hoy — cambiar de proveedor más
// adelante es escribir una clase nueva que implemente `translate()`, sin
// tocar `translateI18nField` ni a quien lo llama.
//
// `translateI18nField` es la orquestación que ya vivía en enrichI18nField
// (apps/admin/server/utils/translate.ts, que ahora es un wrapper delgado de
// esto para no romper a sus ~7 call sites existentes): decide qué locale es
// la fuente, traduce el resto, y ahora además arma el `FieldI18nStatus` que
// se persiste en la nueva columna `i18n_status` (manual/auto/error por
// locale) — ver supabase/migrations/*_i18n_status.sql.

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'

// DeepL necesita códigos especiales para un puñado de locales (variantes de
// región para target, sin región para source) — el resto usa directamente su
// código en mayúsculas, válido para la gran mayoría de idiomas de DeepL. Así,
// agregar un locale nuevo a CONTENT_LOCALES (layers/domain/config/locales.ts)
// no requiere tocar esto salvo que necesite una excepción como 'en'.
const DEEPL_TARGET_OVERRIDES: Record<string, string> = { en: 'EN-US' }
const DEEPL_SOURCE_OVERRIDES: Record<string, string> = {}

function toDeeplTarget(locale: string): string {
  return DEEPL_TARGET_OVERRIDES[locale] ?? locale.toUpperCase()
}

function toDeeplSource(locale: string): string {
  return DEEPL_SOURCE_OVERRIDES[locale] ?? locale.toUpperCase()
}

export interface TranslationProvider {
  translate(text: string, from: string, to: string): Promise<string>
}

export class DeepLProvider implements TranslationProvider {
  constructor(private readonly apiKey: string) {}

  async translate(text: string, from: string, to: string): Promise<string> {
    const res = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: toDeeplTarget(to),
        source_lang: toDeeplSource(from),
      }),
    })

    if (!res.ok) {
      throw new Error(`DeepL ${res.status}: ${await res.text()}`)
    }

    const data = (await res.json()) as { translations: { text: string }[] }
    const translated = data.translations?.[0]?.text
    if (!translated) throw new Error('DeepL returned no translation')
    return translated
  }
}

export interface TranslateI18nFieldParams {
  existing: Record<string, string>
  apiKey: string
  previous?: Record<string, string>
  priorStatus?: FieldI18nStatus
  targetLocalesPool?: readonly string[]
  // Retry: locales to unconditionally (re)translate regardless of the normal
  // changed/empty rules — e.g. re-attempting locales currently `status:'error'`.
  // Never applies to the source locale itself.
  forceLocales?: readonly string[]
  provider?: TranslationProvider
}

export interface TranslateI18nFieldResult {
  value: Record<string, string>
  status: FieldI18nStatus | undefined
}

// Política de fuente canónica (English-first, ver §G de la propuesta): un
// locale que un admin editó a mano en un guardado anterior queda protegido —
// un guardado posterior en OTRO locale (ej. English) no lo pisa
// automáticamente, aunque nada haya vuelto a tocar ese locale en particular.
// Sólo se pierde la protección si el propio locale protegido vuelve a
// editarse (entonces vuelve a marcarse 'manual' con el valor nuevo) o si el
// admin lo resetea explícitamente a 'auto' desde la UI (Phase 4).
function isProtectedManualLocale(status: FieldI18nStatus | undefined, locale: string): boolean {
  const entry = status?.[locale]
  return typeof entry === 'object' && entry !== null && entry.status === 'manual'
}

/**
 * Toma un campo i18n JSONB existente y completa los idiomas faltantes con el
 * TranslationProvider configurado. Si se pasa `previous` (el valor que ya
 * estaba en la DB), cualquier locale cuyo texto cambió respecto a `previous`
 * se trata como la nueva fuente y se propaga al resto — no sólo a los vacíos.
 * Sin `previous` (crear una fila nueva), sólo se completan los vacíos.
 * Cada locale que disparó la traducción queda `manual` en el status
 * devuelto; cada locale que el provider completó queda `auto`; un locale que
 * el provider no pudo traducir queda `error` y conserva el texto que ya
 * tenía (nunca se vacía por un fallo).
 */
export async function translateI18nField(
  params: TranslateI18nFieldParams
): Promise<TranslateI18nFieldResult> {
  const {
    existing,
    apiKey,
    previous,
    priorStatus,
    targetLocalesPool = getConfiguredLocales(),
    forceLocales = [],
    provider = new DeepLProvider(apiKey),
  } = params

  const changedLocales = previous
    ? targetLocalesPool.filter(
        (locale) => existing[locale]?.trim() && existing[locale] !== previous[locale]
      )
    : []

  const sourceLocale = changedLocales[0] ?? Object.entries(existing).find(([, v]) => v?.trim())?.[0]

  if (!sourceLocale) return { value: existing, status: priorStatus }

  const sourceText = existing[sourceLocale]
  if (!sourceText?.trim()) return { value: existing, status: priorStatus }

  // Si se editó manualmente uno o más idiomas, retraducimos el resto a partir
  // del primero que cambió — pero nunca un locale que ya estaba protegido
  // como 'manual' de un guardado anterior (isProtectedManualLocale), aunque
  // no haya cambiado en este guardado en particular. Si no hay ningún cambio
  // detectado, sólo completamos los vacíos (ahí no hay nada que proteger).
  // forceLocales (retry) se suma siempre, salvo el propio source.
  const baseTargets =
    changedLocales.length > 0
      ? targetLocalesPool.filter(
          (locale) =>
            !changedLocales.includes(locale) && !isProtectedManualLocale(priorStatus, locale)
        )
      : targetLocalesPool.filter((locale) => !existing[locale]?.trim())
  const forced = forceLocales.filter((locale) => locale !== sourceLocale)
  const targetLocales = Array.from(new Set([...baseTargets, ...forced]))

  // No-op genuino: nada cambió y no hay nada para completar — ni tocamos el
  // status ni llamamos al provider.
  if (changedLocales.length === 0 && targetLocales.length === 0) {
    return { value: existing, status: priorStatus }
  }

  const now = new Date().toISOString()
  const status: FieldI18nStatus = { ...(priorStatus ?? {}), sourceLocale }

  // El/los locale(s) que dispararon esta traducción fueron escritos a mano:
  // cambiaron respecto al valor previo, o (al crear) son el único valor
  // presente.
  const manualLocales = changedLocales.length > 0 ? changedLocales : !previous ? [sourceLocale] : []
  for (const locale of manualLocales) {
    status[locale] = { status: 'manual', updatedAt: now }
  }

  const result: Record<string, string> = { ...existing }
  if (targetLocales.length === 0) return { value: result, status }

  await Promise.all(
    targetLocales.map(async (targetLocale) => {
      try {
        const translated = await provider.translate(sourceText, sourceLocale, targetLocale)
        result[targetLocale] = translated
        status[targetLocale] = { status: 'auto', updatedAt: now }
      } catch (err) {
        console.error(`Translation failed for ${targetLocale}:`, err)
        status[targetLocale] = {
          status: 'error',
          updatedAt: now,
          error: err instanceof Error ? err.message : 'unknown_error',
        }
      }
    })
  )

  return { value: result, status }
}
