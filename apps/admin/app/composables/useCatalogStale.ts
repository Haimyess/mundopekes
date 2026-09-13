// app/composables/useCatalogStale.ts
// Flags compartidos para saber si Places/Activities necesitan revalidar al
// reactivarse (ver definePageMeta({ keepalive: true }) en sus páginas). Sólo
// cambian por acciones que la propia app ya conoce: crear/editar/borrar (que
// ya refresca la página que los dispara) o aprobar/fusionar una sugerencia
// desde Suggestions (ver useSuggestions.ts), que puede crear un lugar y/o
// una actividad sin que Places/Activities estén montadas para enterarse.
// Evita pegarle a la base en cada navegación cuando nada cambió.
export const usePlacesStale = () => useState('places-needs-refresh', () => false)
export const useActivitiesStale = () => useState('activities-needs-refresh', () => false)
