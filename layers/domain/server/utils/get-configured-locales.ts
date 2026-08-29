import { CONTENT_LOCALES, SOURCE_LOCALE } from '../../config/locales'

// Punto único server-side para saber "a qué idiomas traducimos" — reemplaza
// las listas hardcodeadas que antes vivían sueltas en translate.ts. No depende
// de useRuntimeConfig(event) porque no es un valor por-ambiente (como sí lo es
// deeplApiKey vía getDeeplApiKey) sino una constante de código compartida.
export function getConfiguredLocales(): readonly string[] {
  return CONTENT_LOCALES
}

export { SOURCE_LOCALE }
