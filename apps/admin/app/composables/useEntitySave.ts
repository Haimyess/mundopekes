// Extrae el patrón que se repetía casi idéntico en el save()/saveEdit() de
// PlacesSlideover, ActivitiesSlideover y SuggestionsSlideover: loading +
// try/fetch/catch-con-toast/finally. Los tres drawers ya comparten el
// renderizado de campos (EntityFormFields.vue) — esto es la otra mitad de la
// duplicación, la lógica de guardado.
//
// No se intenta unificar el ESTADO del form (name_i18n/title_i18n/etc.) en un
// solo composable genérico: Place/Activity/Suggestion tienen campos, reglas
// de validación y endpoints genuinamente distintos, y forzar eso a una sola
// forma reactiva compartida sería más complejo que las tres implementaciones
// actuales, no menos (regla del proyecto: no forzar una abstracción si
// complica el código). Lo que sí se repetía palabra por palabra es esto.

export function hasI18nContent(record: Record<string, string> | null | undefined): boolean {
  return Object.values(record ?? {}).some((v) => v?.trim())
}

/**
 * Envuelve una llamada de guardado con loading + manejo de error (toast).
 * Recibe el ref de loading explícitamente en vez de ser dueño de uno —
 * así sirve tanto para drawers con su propio loading (useEntitySave() abajo)
 * como para SuggestionsSlideover, que comparte un único `actionLoading` entre
 * aprobar/rechazar/fusionar/guardar (viene de useSuggestions()).
 *
 * Devuelve el valor resuelto si `fn` tuvo éxito, o `undefined` si tiró. ---
 * Ninguno de los call sites actuales espera legítimamente `undefined` como
 * resultado exitoso, así que ese es un sentinel seguro acá; un caller para el
 * que `undefined` sí sea un resultado válido no debería apoyarse en esto.
 */
export async function runSaveAction<T>(
  loading: Ref<boolean>,
  fn: () => Promise<T>,
  errorTitle: string
): Promise<T | undefined> {
  const toast = useToast()
  loading.value = true
  try {
    return await fn()
  } catch (e) {
    toast.add({
      title: errorTitle,
      description: e instanceof Error ? e.message : String(e),
      color: 'error',
    })
    return undefined
  } finally {
    loading.value = false
  }
}

// Conveniencia para el caso común: un drawer con su propio loading local
// (Places, Activities) en vez de uno compartido entre varias acciones.
export function useEntitySave() {
  const loading = ref(false)
  const run = <T>(fn: () => Promise<T>, errorTitle: string) =>
    runSaveAction(loading, fn, errorTitle)
  return { loading, run }
}
