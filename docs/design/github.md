repo: Haimyess/mundopekes
branch: main
path: apps/web

## Last sync
date: 2026-11-07T11:11:02Z

### Updated in this project
- Gap review of apps/web vs. MVP design (SSR, i18n prefix, consent, multi-age, family cookie, occasions, 410, SEO)

## Sync history
date: 2026-11-07T11:07:07Z
- New: Admin Sugerencias (quick-suggestion slideover, duplicate state, list filter) from SuggestionsSlideover.vue
date: 2026-11-03T08:03:42Z
- Reviewed admin suggestions inbox; gap: web endpoint only accepts the 9-step wizard payload

date: 2026-10-30T08:25:31Z
- Home Completa: CTA, Footer and PWA bottom nav added from source; favorites icon replaces hamburger

date: 2026-10-22T06:54:42Z
- New page: Flujo de búsqueda (Home → resultados → filtros → sin resultados → mapa)
- v2 documentation with per-component specs
- Recreated mobile web Home, Activity, Search and component library

## Screen map
| Screen | Repo files |
|---|---|
| Home (1a) | apps/web/app/pages/index.vue, components/home/Hero.vue, SearchForm.vue, ActivityCarousel.vue, CTA.vue, shared/ActivityCard.vue, Layout/Navbar.vue, Layout/Footer.vue, pwa/PwaTopBar.vue, pwa/PwaBottomNav.vue |
| Activity (1b) | apps/web/app/pages/activity/[id].vue, components/activity/ActivityImagesGallery.vue, Meta.vue, InfoDescription.vue, InfoLocation.vue, ShareModal.vue, ReportActivityButton.vue, shared/ScheduleTable.vue |
| Search (1c) | apps/web/app/pages/search.vue, components/search/ActivityGrid.vue, ActiveFilters.vue, place/PlaceCard.vue, layouts/fullwidth.vue |
| Components (1d) | apps/web/app/assets/css/design-system.css, layers/ui/components/ui/*, search/MapCard.vue, pwa/PwaFloatingSearchBar.vue |
| Sugerir actividad (form corto) | apps/web/server/api/suggestions/index.post.ts, components/suggestions/SuggestionWizard.vue, layers/domain/server/utils/duplicate-detection.ts |
| Admin Sugerencias (A1–A3) | apps/admin/app/pages/suggestions.vue, components/suggestions/SuggestionsSlideover.vue, composables/useSuggestions.ts, server/api/suggestions/* |
