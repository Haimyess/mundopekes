# Fase 12 — Inventario de componentes: App Kit frente al código actual

> Fecha: 2026-11-09 · Rama: `mvp-new-design` · Alcance: solo lectura, sin cambios de código.
>
> Fuentes: `docs/design/MundoPekes App Kit.dc.html` (52 componentes en 9 grupos), `docs/design/Entrega
Desarrollo.dc.html`, el código de `apps/web` y `layers/ui`, y una consulta de solo lectura a
> producción para ver qué datos existen.
>
> **Para aprobar:** la columna «Acción» de cada tabla y las decisiones de §6.

## Leyenda

| Acción         | Significado                                                             |
| -------------- | ----------------------------------------------------------------------- |
| **Conservar**  | Se queda como está                                                      |
| **Modificar**  | Se adapta al diseño nuevo conservando el componente y su API            |
| **Reemplazar** | Se crea uno nuevo y se borra el viejo cuando deja de tener consumidores |
| **Crear**      | No existe nada equivalente                                              |
| **Borrar**     | Código sin uso o sustituido                                             |
| **Después**    | Fuera del MVP (app React Native o post-lanzamiento)                     |

Ubicación: **ui** = `layers/ui/components/ui` (wrappers reutilizables, prefijo `Ui`) · **web** =
`apps/web/app/components`.

---

## 1. Principios de construcción

1. **Primitivos de presentación en Vue y CSS puro** (botón, chip, tarjeta, skeleton, título de
   sección). No dependen de Nuxt UI, que aquí aporta poco y arrastra clases de Tailwind.
2. **Componentes con comportamiento complejo sobre Nuxt UI, siempre mediante wrapper**: drawer,
   popover, modal, calendario, pestañas, interruptor, toast y acordeón. Aportan foco atrapado,
   `role="dialog"`, teclado y ARIA, que la entrega exige. Los estilos del diseño se aplican con clases
   propias y CSS con tokens `--mp-*`, sin utilidades de Tailwind.
3. **Una sola primitiva responsive para los overlays (`UiSheet`)**: drawer desde abajo en móvil,
   popover bajo el campo en escritorio (regla 3 de la entrega). Decide la variante con
   `useHydrationSafeMediaQuery`, así que es compatible con SSR.
4. **Cada componente nuevo trae** su test de Vitest, accesibilidad (44 px, foco visible de 3 px,
   contraste AA), i18n, RTL con propiedades lógicas, estados de carga, vacío y error, y compatibilidad
   con SSR (nada de `window` ni `localStorage` en el render).
5. **Admin no se toca.** Los wrappers de formulario que solo usa admin (§4) se quedan como están.

---

## 2. Grupos del App Kit

### g0 · Fundamentos (5)

| App Kit            | Hoy                           | Acción                                        | Dónde / base   | Notas                                                                                                                                                  |
| ------------------ | ----------------------------- | --------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Colores            | `tokens.css` (`--mp-*`)       | Conservar                                     | —              | Hecho en la Fase 11                                                                                                                                    |
| Tipografía         | `tokens.css` + `@nuxt/fonts`  | Conservar                                     | —              | Hecho en la Fase 11. Falta la fuente cirílica (§6.1)                                                                                                   |
| Íconos             | `UiIcon` (31 líneas, 39 usos) | **Modificar**                                 | ui · `UIcon`   | Hugeicons, tamaños limitados a 14/16/20/24/32/40, `aria-hidden` por defecto y espejo en RTL solo para flechas y chevrons                               |
| Botones y chips    | `UiButton` (19 usos)          | **Modificar** `UiButton` y **Crear** `UiChip` | ui · Vue + CSS | Botón primario negro, secundario con borde y link subrayado, área táctil de 44 px. El chip es pill, con `aria-pressed`, estado activo y icono opcional |
| Radios y espaciado | `tokens.css`                  | Conservar                                     | —              | Hecho en la Fase 11                                                                                                                                    |

### g1 · Navegación (5)

| App Kit                      | Hoy                                                                             | Acción         | Dónde / base                  | Notas                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------- | -------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Header (web)                 | `LayoutNavbar` (235) + `LayoutMobileMenu` (307) + `LayoutLanguageSelector` (95) | **Reemplazar** | web · `LayoutHeader`          | Logo, ciudad, idioma, favoritos y búsqueda, con chips de categoría debajo; se oculta con el scroll |
| Header (app)                 | —                                                                               | Después        | —                             | React Native                                                                                       |
| Barra inferior (app)         | `PwaBottomNav` (289)                                                            | Después        | —                             | La PWA actual se conserva sin cambios hasta decidir su futuro (§6.4)                               |
| Barra compacta de resultados | —                                                                               | **Crear**      | web · `SearchCompactBar`      | Aparece con el scroll                                                                              |
| Botón flotante «Filtros»     | —                                                                               | **Crear**      | web · `SearchFloatingFilters` | Pill centrado abajo                                                                                |

### g2 · Búsqueda (5)

| App Kit                         | Hoy                                          | Acción         | Dónde / base                                | Notas                                                                         |
| ------------------------------- | -------------------------------------------- | -------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| Hero + buscador compacto        | `HomeHero` (89) + `HomeSearchForm` (**986**) | **Reemplazar** | web · `HomeHeroSearch` + ui `UiSearchField` | La caja Dónde / Cuándo / Quiénes abre `UiSheet`; filtros rápidos con `UiChip` |
| Tu búsqueda (guardada)          | —                                            | No se hace     | —                                           | El propio App Kit la marca como obsoleta y la sustituye «Para tu familia»     |
| Header de resultados            | —                                            | **Crear**      | web · `SearchResultsHeader`                 | Abre «Tu búsqueda»                                                            |
| Chips de categoría con contador | `SearchActiveFilters` (100), en parte        | **Reemplazar** | web · `SearchCategoryChips`                 | Con conteo desde el servidor                                                  |
| ¿Guardamos esta búsqueda?       | —                                            | **Crear**      | web · `FamilySavePrompt`                    | Fase 19, con la cookie `mp_family`                                            |

### g3 · Drawers (8)

Todos se construyen sobre la primitiva común **`UiSheet`** (ui · wrapper de `UDrawer` y `UPopover`).

| App Kit               | Hoy                                          | Acción           | Dónde / base                                            | Notas                                                                                |
| --------------------- | -------------------------------------------- | ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| ¿Dónde?               | Parte de `HomeSearchForm`                    | **Crear**        | web · `SearchWhereSheet`                                | «Cerca de mí» con geolocalización solo al pulsar                                     |
| ¿Cuándo?              | Parte de `HomeSearchForm`                    | **Crear**        | web · `SearchWhenSheet` + ui `UiCalendar` (`UCalendar`) | Atajos desde `occasions` (Fase 15); semana de domingo a sábado                       |
| ¿Quiénes van?         | `UiAgeRangeSelector` (solo admin)            | **Crear**        | web · `SearchWhoSheet` + ui `UiStepper`                 | Edades por hijo                                                                      |
| Tu búsqueda           | —                                            | **Crear**        | web · `SearchEditSheet`                                 | Reutiliza los tres anteriores                                                        |
| Filtros               | `SearchFilterDrawer` (**673**)               | **Reemplazar**   | web · `SearchFiltersSheet` + ui `UiSwitch` (`USwitch`)  | Interruptores con `role="switch"`                                                    |
| Ordenar por           | —                                            | **Crear**        | web · `SearchSortSheet`                                 | Opciones como radio group                                                            |
| Sugiere una actividad | `SuggestionWizard` + 6 pasos (≈2 400 líneas) | **Reemplazar**   | web · `SuggestionQuickSheet`                            | Formulario corto con `suggestionShortRequestSchema` (ya existe) y Turnstile          |
| Reclamar ficha        | —                                            | **Crear** (§6.2) | web · `ClaimListingSheet`                               | Solo relación con el negocio y datos de contacto: captación manual, sin verificación |

### g4 · Tarjetas (5)

Base común: **`UiMediaCard`** (ui · Vue + CSS), con foto con ratio fijo, badge, favorito y slots de
contenido. Las variantes son composiciones de esta base, no copias.

| App Kit                          | Hoy                                  | Acción         | Dónde / base                 | Notas                              |
| -------------------------------- | ------------------------------------ | -------------- | ---------------------------- | ---------------------------------- |
| Tarjeta de actividad (destacada) | `SharedActivityCard` (334)           | **Reemplazar** | web · `ActivityCardFeatured` |                                    |
| Tarjeta de carrusel              | Variante de `SharedActivityCard`     | **Crear**      | web · `ActivityCardCarousel` | Cuadrada                           |
| Tarjeta de resultado             | `SearchActivityGrid` (213), en parte | **Crear**      | web · `ResultCard`           | 150 px, etiqueta Lugar o Actividad |
| Tarjetas del mapa                | `SearchMapCard` (176)                | **Reemplazar** | web · `MapResultCard`        | La seleccionada lleva borde        |
| Fila de favorito                 | —                                    | Después        | —                            | App                                |

### g5 · Secciones del home (9)

| App Kit                | Hoy                                      | Acción                          | Dónde / base                                                     | Notas                                                                                                          |
| ---------------------- | ---------------------------------------- | ------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Sección contextual     | —                                        | **Crear**                       | web · `HomeContextSection`                                       | Depende de `occasions` (Fase 15) y de `useHomeContext`                                                         |
| Categorías             | Parte de `LayoutNavbar`                  | **Crear**                       | web · `HomeCategoryGrid`                                         | Grilla 4×2                                                                                                     |
| Cerca de ti            | —                                        | **Crear**                       | web · `HomeNearby`                                               | Mapa chico. La ubicación solo se pide al pulsar «Usar ubicación»                                               |
| Ahorra                 | —                                        | **Crear, solo «Gratis»** (§6.3) | web · `HomeSavings` + ui `UiTabs` (`UTabs`)                      |                                                                                                                |
| Ahorra · con club      | —                                        | Después (§6.3)                  | —                                                                | No hay datos de clubes                                                                                         |
| Carrusel por categoría | `HomeActivityCarousel` (219)             | **Reemplazar**                  | web · `HomeCategoryCarousel` + ui `UiCarousel` (CSS scroll-snap) | Solo se pinta con 4 o más planes                                                                               |
| CTAs                   | `HomeCTA` (147) + `HomeProviderCTA` (46) | **Reemplazar**                  | web · `HomeCtas`                                                 | Sugerir (padres) y Sumar negocio (proveedores)                                                                 |
| Acceso para negocios   | —                                        | **Crear**                       | web · `SearchBusinessLink`                                       | Línea al final de la lista                                                                                     |
| Footer (solo web)      | `LayoutFooter` (123)                     | **Reemplazar**                  | web · `LayoutFooter`                                             | Enlaces SEO en acordeón (ui `UiAccordion`), idioma, redes, app y enlace «Cookies» que llama a `resetConsent()` |

### g6 · Mapa (1)

| App Kit        | Hoy                                  | Acción                            | Dónde / base      | Notas                                                                                         |
| -------------- | ------------------------------------ | --------------------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| Barra del mapa | Parte de `SearchMapView` (**1 027**) | **Crear** + **Modificar** el mapa | web · `MapTopBar` | `SearchMapView` se divide: pines, clúster, sincronía con la lista y «Buscar al mover el mapa» |

### g7 · Lugar y actividad (11)

| App Kit                       | Hoy                                                       | Acción                           | Dónde / base                | Notas                                                                                                 |
| ----------------------------- | --------------------------------------------------------- | -------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| Galería de la ficha           | `ActivityImagesGallery` (185)                             | **Reemplazar**                   | web · `DetailGallery`       | Responsive solo con CSS: elimina el cambio de variante que se vio en la Fase 10                       |
| Resumen + acciones rápidas    | `ActivityInfoHeader` (87) + `ActivityMeta` (158)          | **Reemplazar**                   | web · `DetailSummary`       | Cómo llegar, Llamar, Web, WhatsApp. Hay datos: 15 de 17 lugares tienen teléfono y web                 |
| Actividades del lugar         | `PlaceActivityRow` (173)                                  | **Reemplazar**                   | web · `PlaceActivitiesList` |                                                                                                       |
| Horarios                      | `ActivityInfoSchedule` (298) + `SharedScheduleTable` (92) | **Reemplazar**                   | web · `DetailHours`         | Ver §5: «hoy» y «abierto ahora» necesitan horarios estructurados                                      |
| Precios                       | —                                                         | **Crear, versión simple** (§6.3) | web · `DetailPrices`        | Sin tabla por edad ni club: no hay datos                                                              |
| Ubicación                     | `ActivityInfoLocation` (341)                              | **Reemplazar**                   | web · `DetailLocation`      |                                                                                                       |
| Servicios y accesibilidad     | `ActivityInfoFeatures` (247)                              | **Reemplazar**                   | web · `DetailAmenities`     | Datos disponibles: sombra, baños, cochecito, silla de ruedas, **espacio protegido** (`has_safe_room`) |
| ¿Es tu negocio?               | —                                                         | **Crear** (§6.2)                 | web · `ClaimListingBanner`  | Abre «Reclamar ficha»                                                                                 |
| Próximas funciones            | —                                                         | Después (§5)                     | —                           | No hay modelo de funciones por día                                                                    |
| Dónde (lugar de la actividad) | Parte de `ActivityInfoLocation`                           | **Crear**                        | web · `ActivityVenueCard`   |                                                                                                       |
| Barra de acción fija          | —                                                         | **Crear**                        | web · `DetailActionBar`     | «Cómo llegar»; sin reserva hasta la Fase 3                                                            |

### g8 · App (3)

| App Kit                  | Hoy                                              | Acción         | Dónde / base                                                            | Notas                                               |
| ------------------------ | ------------------------------------------------ | -------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| Tu búsqueda en Favoritos | —                                                | Después        | —                                                                       | App                                                 |
| Grupo de ajustes         | —                                                | Después        | —                                                                       | App                                                 |
| Página Para negocios     | `pages/become-provider.vue` (redirige a la home) | **Reemplazar** | web · `pages/negocios.vue` (nombre de ruta a decidir en la fase de SEO) | Es «Súmate». Usa `providerSignupSchema` (ya existe) |

### Fuera del App Kit pero en la entrega

| Elemento                                              | Acción                                                     | Notas                                            |
| ----------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| «Para tu familia» (bloque del home y estado guardado) | **Crear** `HomeFamilyBlock` y `useFamilyProfile`           | Fase 19; esquema Zod de la cookie `mp_family`    |
| Estados: skeleton, sin resultados, error, fallback    | **Crear** ui `UiSkeleton`, web `StateEmpty` y `StateError` | Fase 14. Skeleton con la forma real, sin spinner |
| Páginas 404 y 410                                     | **Crear** `error.vue`                                      | Fase 14; 410 con `noindex` y 2–4 parecidas       |
| Banner de cookies                                     | **Modificar** `CookieConsentBanner`                        | Solo el estilo; la lógica ya está (Fase 8)       |
| Toast inline de error                                 | **Crear** ui `UiToast` (`useToast`)                        |                                                  |

---

## 3. Primitivos nuevos o modificados en `layers/ui`

Es el orden propuesto para la Fase 13, de lo más usado a lo más específico:

| Primitivo              | Base                      | Lo usan                               |
| ---------------------- | ------------------------- | ------------------------------------- |
| `UiIcon` (modificar)   | `UIcon`                   | Todo                                  |
| `UiButton` (modificar) | Vue + CSS                 | Todo                                  |
| `UiChip`               | Vue + CSS                 | Header, buscador, filtros, resultados |
| `UiSkeleton`           | Vue + CSS                 | Todas las listas y carruseles         |
| `UiSectionHeader`      | Vue + CSS                 | Secciones del home y de las fichas    |
| `UiMediaCard`          | Vue + CSS                 | Las 4 tarjetas                        |
| `UiCarousel`           | CSS scroll-snap + botones | Carruseles y galería                  |
| `UiSheet`              | `UDrawer` + `UPopover`    | Los 8 drawers                         |
| `UiCalendar`           | `UCalendar`               | ¿Cuándo?                              |
| `UiStepper`            | Vue + CSS                 | ¿Quiénes van?                         |
| `UiSwitch`             | `USwitch`                 | Filtros                               |
| `UiTabs`               | `UTabs`                   | Ahorra                                |
| `UiAccordion`          | `UAccordion`              | Footer                                |
| `UiToast`              | `useToast`                | Errores de sección                    |

Son **14 primitivos**. Propongo dividir la Fase 13 en dos sesiones:

- **13a:** `UiIcon` a `UiCarousel`, los presentacionales.
- **13b:** `UiSheet` a `UiToast`, los de overlay e interacción.

---

## 4. Código actual que se queda, se borra o queda fuera

**Se queda (solo lo usa admin, que no se toca):** `UiEntityFormFields`, `UiEntitySlideover`,
`UiActivityFields`, `UiPlaceAttributesFields`, `UiScheduleEditor`, `UiI18nTabs`, `UiImageUploader`,
`UiSeasonSelector`, `UiAgeRangeSelector`, `UiPlaceSearch`, `UiCheckbox`.

**Se borra ya, sin uso (0 referencias verificadas):**

| Archivo                                              | Líneas |
| ---------------------------------------------------- | ------ |
| `apps/web/app/components/Layout/LanguagePopover.vue` | 62     |
| `apps/web/app/components/activity/ActivityInfo.vue`  | 53     |
| `apps/web/app/components/activity/InfoCard.vue`      | 118    |
| `apps/web/app/components/activity/PhotoGrid.vue`     | 56     |
| `layers/ui/components/ui/Dropdown.vue`               | 22     |

**Se borra cuando su reemplazo esté listo:** todo lo marcado «Reemplazar». Lo más grande:

- el wizard de sugerencias (≈2 400 líneas);
- `HomeSearchForm` (986);
- `SearchMapView`, que se divide (1 027);
- `SearchFilterDrawer` (673);
- `ShareModal` (509).

En total son unas 6 000 líneas que salen del código.

**Queda fuera, en pausa:** `ContactDrawer` y `ContactFormBody`. El formulario de contacto está en
pausa (Confluence, 2 de noviembre). Propongo desmontarlo del layout al rediseñar el header y conservar
el código hasta que se decida el nuevo formulario.

---

## 5. Datos que condicionan componentes (producción, solo lectura)

| Dato                         | Estado                                                                                                            | Componente afectado                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Fotos propias de actividades | Solo **2 de 16** actividades                                                                                      | Tarjetas y galería: hacen falta foto de respaldo del lugar y un placeholder del diseño |
| Fotos de lugares             | En `metadata.photos` (Google)                                                                                     | Galería del lugar                                                                      |
| Teléfono y web del lugar     | 15 de 17                                                                                                          | Acciones rápidas: viable                                                               |
| Coordenadas                  | 16 de 17                                                                                                          | Mapa y «Cerca de ti»: viable                                                           |
| Horarios                     | Lugares: **texto** de Google en 14 de 17. Actividades: `schedule` (texto) más `schedule_structured` en `metadata` | «Abierto ahora» y «hoy marcado» necesitan horarios estructurados del lugar             |
| Precio                       | Solo 5 de 16 actividades; sin precio por edad                                                                     | Precios: versión simple (precio, gratis o sin dato)                                    |
| Descuentos por club          | **No existen**                                                                                                    | Ahorra · con club y la tabla de precios con club                                       |
| Funciones por día            | **No existen**                                                                                                    | Próximas funciones                                                                     |
| Espacio protegido            | `has_safe_room` en lugares                                                                                        | Servicios y filtros: viable                                                            |

---

## 6. Decisiones para aprobar

1. **Fuente cirílica.** Albert Sans no tiene cirílico. Hasta que se elija una alternativa (Manrope,
   Onest o Golos Text), el ruso usa la fuente del sistema.
2. **«Reclamar ficha» y «Página Para negocios» entran en el MVP** en versión mínima: un formulario
   de captación que llega a la bandeja de proveedores del admin, sin verificación ni autoservicio.
   Están en el App Kit y coinciden con F-PROV-01 mínima de Confluence (§4 de esa página).
   **Recomendado: sí.**
3. **Recortes por falta de datos.** «Ahorra» solo con la pestaña «Gratis», «Precios» en versión
   simple, y «Ahorra con club» y «Próximas funciones» para después del lanzamiento. Confluence ya
   pone los descuentos por club como post-MVP. **Recomendado: sí.**
4. **PWA actual** (`PwaBottomNav`, `PwaTopBar`, `PwaExploreScreen`, `PwaFloatingSearchBar`): la
   barra inferior del diseño es de la app React Native. Propongo no tocar la PWA en el MVP, revisar
   después del lanzamiento si se mantiene, y no ofrecer el aviso de instalación mientras tanto.
5. **Horarios estructurados de lugares.** «Abierto ahora» (en el resumen y como filtro rápido)
   necesita convertir los horarios de texto en datos. Opciones: (a) parsearlos en el servidor desde
   `opening_hours_text` (ya existe `parseGoogleHoursToSchedule`); (b) dejar «Abierto ahora» para
   después. **Recomendado: (a)**, como parte de la Fase 15.
6. **División de la Fase 13** en 13a (presentacionales) y 13b (overlays). **Recomendado: sí.**

## 7. Siguiente paso

Con las decisiones aprobadas:

1. Borrar los 5 archivos sin uso. Va como primer commit de la Fase 13a.
2. Fase 13a: los primitivos presentacionales de §3, con tests, accesibilidad y RTL.
