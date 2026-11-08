# Fase 9 — Diagnóstico del SSR en `apps/web`

> Fecha: 2026-11-08 · Rama de trabajo: `mvp-new-design` (base `41ad4eb`) · Alcance: diagnóstico, sin cambios de código.
>
> Método: rama local `ssr-experiment` (no publicada, ya borrada) con el único cambio de abajo, build de
> producción, servidor generado (`node .output/server/index.mjs`) con la URL y la clave **publicable**
> reales de Supabase, peticiones HTTP a cada ruta y navegador real (Playwright/Chromium) para medir la
> hidratación en móvil (390 px) y escritorio (1280 px).
>
> ```diff
> -  ssr: false,
> +  ssr: true,
> +  debug: { hydration: true },
> ```
>
> `debug.hydration` solo se usó para obtener el detalle de los errores de hidratación; no forma parte de
> la propuesta.

---

## 1. Conclusión

**El SSR se puede activar.** El build compila, todas las rutas responden y renderizan HTML en el
servidor, el plugin SSR de `@nuxtjs/supabase` funciona y las páginas de detalle sirven el contenido real
de la base de datos. **El conflicto de `h3` no existe hoy.**

Para activarlo sin regresiones hay que resolver **3 problemas bloqueantes**, listados en §4. El resto
(metadatos SEO, home y búsqueda renderizadas en servidor) son trabajo ya previsto en fases posteriores.

---

## 2. El conflicto de `h3`: no se reproduce

- `ssr: false` se introdujo el **13 de junio** (`0962423`). El pin de `h3` llegó el **8 de agosto**
  (`047a0e5`). La explicación de `.ai/project/architecture.md` ("workaround por un conflicto de `h3`")
  no cuadra con las fechas: la causa original de desactivar el SSR es desconocida.
- Con `ssr: true` el plugin SSR de Supabase se ejecuta en cada petición sin ningún error.
- El pin es **redundante**: `h3@1.15.11` es la última versión 1.x (`npm view h3 dist-tags` → `1x:
1.15.11`) y todas las dependencias que lo usan piden `^1.15.11` (`nitropack@2.13.4`,
  `@nuxtjs/i18n@10.6.0` y otras 11 en el lockfile). Sin el pin se resolvería exactamente lo mismo.

**Recomendación:** quitar `h3` de las `dependencies` del `package.json` raíz (no hay código en la raíz
que lo use). Se puede mantener `h3` en `pnpm-workspace.yaml → overrides` como suelo de seguridad, o
quitarlo también; hoy no cambia nada.

---

## 3. Resultados por ruta (servidor SSR, datos reales)

| Ruta                                       | HTTP       | Contenido en el HTML del servidor                                        | `<title>`                   |
| ------------------------------------------ | ---------- | ------------------------------------------------------------------------ | --------------------------- |
| `/`                                        | 200        | Hero, navegación y footer. **Sin actividades**: se cargan en `onMounted` | Genérico, en español        |
| `/search`                                  | 200        | Cabecera y filtros. **Sin resultados**: se cargan en `onMounted`         | `חיפוש פעילויות`            |
| `/about`, `/privacy`, `/terms`             | 200        | Completo                                                                 | Por página                  |
| `/activity/:id` (válido)                   | 200        | **Completo**, con título y descripción desde la base                     | `פיקניק בפארק · MundoPekes` |
| `/place/:id` (válido)                      | 200        | **Completo**                                                             | `חוף רמבם · MundoPekes`     |
| `/activity/:id` (inexistente o malformado) | **200** ❌ | Layout vacío                                                             | `MundoPekes`                |
| `/place/:id` (inexistente)                 | **200** ❌ | Layout vacío                                                             | `MundoPekes`                |
| `/become-provider`                         | 302        | Redirige a la home (estado actual)                                       | —                           |
| `/no-existe`                               | 404        | Página de error por defecto de Nuxt, en inglés                           | `404 - Page not found`      |

- `lang="he"` y `dir="rtl"` salen bien en el HTML del servidor.
- La CSP de `nuxt-security` funciona con SSR: `script-src` usa `nonce` y `strict-dynamic`, y no hubo
  violaciones en el navegador.
- El banner de cookies y la carga de GA4 se comportan igual que con SPA: 0 peticiones a Google con
  «Solo necesarias», incluso tras recargar, y carga normal con consentimiento previo.
- No hubo errores de ejecución en el servidor por `window`, `localStorage` o `document`. Los accesos
  existentes ya están protegidos.

---

## 4. Problemas bloqueantes para activar el SSR

### 4.1 Errores de hidratación por media queries en JavaScript

En navegador real, **todas las rutas** daban `Hydration completed but contains mismatches` en móvil.
En escritorio solo `/activity/:id`.

| Viewport           | `/`      | `/about` | `/activity/:id` |
| ------------------ | -------- | -------- | --------------- |
| Móvil 390 px       | 4 avisos | 3        | 3               |
| Escritorio 1280 px | 0        | 0        | 3               |

**Causa:** componentes que eligen su **estructura** con `useMediaQuery` (VueUse) durante el `setup`.
En el servidor la media query siempre es `false`, así que el servidor renderiza una variante y el
cliente otra. Los dos casos identificados con el detalle de hidratación:

- `ContactDrawer.vue` (montado en el layout, por eso afecta a todas las rutas): en el servidor
  renderiza `UModal` cerrado (un comentario); en el cliente móvil, `UiDrawer` (un fragmento).
- `ShareModal.vue` (página de actividad): el servidor renderiza la variante móvil (botón); el cliente
  de escritorio espera `UPopover`.

Componentes con el mismo patrón (`useMediaQuery`, `useResponsive`, `useWindowSize`):

| Componente                                      | `v-if` / `v-else` / `v-show`    |
| ----------------------------------------------- | ------------------------------- |
| `components/activity/ActivityImagesGallery.vue` | 5                               |
| `components/home/ActivityCarousel.vue`          | 4                               |
| `components/Layout/LanguageSelector.vue`        | 3 (ya envuelto en `ClientOnly`) |
| `components/activity/ShareModal.vue`            | 2                               |
| `components/contact/ContactDrawer.vue`          | 2                               |
| `components/suggestions/SuggestionWizard.vue`   | 2 (se reemplaza en el rediseño) |

**Solución propuesta:**

- Si solo cambia la presentación: CSS con media queries, una sola estructura.
- Si cambia la estructura (modal frente a drawer): que el primer render del cliente coincida con el
  del servidor y decidir la variante después de montar (por ejemplo, con `useMounted`). Los overlays
  cerrados no se ven, así que no hay parpadeo.
- No usar `ClientOnly` para contenido que tiene que ver Google.

### 4.2 Soft 404 en las páginas de detalle

Un id inexistente o malformado devuelve **HTTP 200** con la página vacía. Google lo trata como
"soft 404" y puede indexar URLs vacías. Las páginas deben lanzar `createError({ statusCode: 404 })`
cuando `useAsyncData` no encuentra el registro. El 410 para actividades cerradas queda para la fase de
SEO, como está previsto.

### 4.3 Iconos descargados de `api.iconify.design` en cada render

`@nuxt/icon` no tiene las colecciones `heroicons` y `lucide` instaladas en `apps/web`, así que el
**servidor** las pide a `api.iconify.design` al renderizar, y el **navegador** también. Con SSR eso
añade latencia a cada respuesta y crea una dependencia externa en el camino crítico. Si la API falla,
los iconos salen vacíos.

**Solución:** instalar las colecciones como dependencias y empaquetarlas
(`icon.serverBundle.collections`). Admin ya usa `@iconify-json/lucide`. Requiere tu aprobación para
añadir `@iconify-json/heroicons` y `@iconify-json/lucide` a `apps/web`.

---

## 5. Hallazgos no bloqueantes (para fases ya planificadas)

| Hallazgo                                                                                                                           | Dónde se resuelve                                               |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Home y búsqueda cargan datos en `onMounted`: el HTML del servidor no tiene actividades                                             | Fases 16 y 18 (rediseño con `useAsyncData` y filtros en la URL) |
| Sin `og:title`, `canonical`, `hreflang` ni JSON-LD; `og:image` vacío si la actividad no tiene imágenes                             | Fase 22 (SEO)                                                   |
| El `<title>` y la `description` por defecto de la home están en español con la interfaz en hebreo                                  | Fase 22                                                         |
| `/privacy` y `/terms` solo tienen el texto en español                                                                              | Contenido legal: revisar traducción                             |
| La página 404 es la de Nuxt, en inglés                                                                                             | Fase 14 (páginas 404 y 410)                                     |
| El build avisa de que `drop: ['console', 'debugger']` de esbuild **se ignora** (Vite usa oxc): los `console.*` llegan a producción | Fase 10, si se quiere conservar ese comportamiento              |
| `/_vercel/insights/script.js` da 404 en local                                                                                      | Esperado: solo existe en Vercel                                 |

---

## 6. Lo que no se pudo medir aquí

- **Tiempos de respuesta reales.** Desde el sandbox, las páginas de detalle tardaron entre 0,9 y 1,8 s,
  pero pasan por un proxy hacia Supabase. Hay que medirlo en un preview de Vercel y decidir la caché
  (`routeRules` con SWR o ISR) en la fase de SEO.
- **Vercel.** No está conectado. Cuando se conecte, el preset de Nitro para Vercel y la caché de
  páginas se validan ahí.

> Nota del sandbox: el `fetch` de Node no usa el proxy del sandbox sin `NODE_USE_ENV_PROXY=1`. Fue
> necesario solo para estas pruebas; no afecta a Vercel ni al desarrollo local.

---

## 7. Plan para la Fase 10 (activar el SSR)

Una sola fase, porque modifica archivos existentes:

1. `ssr: true` en `apps/web/nuxt.config.ts`.
2. Corregir la hidratación en `ContactDrawer` y `ShareModal`, y revisar `ActivityImagesGallery` y
   `ActivityCarousel` con la regla de §4.1. `SuggestionWizard` queda fuera: lo reemplaza el formulario
   corto.
3. 404 real en `/activity/:id` y `/place/:id` cuando el registro no existe.
4. Iconos empaquetados (si apruebas las dos dependencias de §4.3).
5. Quitar `h3` de las dependencias del `package.json` raíz.
6. Tests de Vitest de los componentes modificados y de los 404.

**Verificación:**

- La de siempre: lint, tests, typecheck y build.
- Prueba en navegador de las rutas de §3 en móvil y escritorio: **0 avisos de hidratación**, HTTP 404
  para ids inexistentes, contenido real en el HTML del servidor y consentimiento de GA4 intacto.

**Reversión:** `git revert` del commit; volver a `ssr: false` basta para recuperar el comportamiento
actual.
