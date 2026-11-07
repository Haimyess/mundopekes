# Fase 1A — Auditoría del monorepo y gestor de paquetes

> Fecha: 2026-11-07 · Rama: `mvp-new-design` (creada desde `dev` @ `8ec48a3`) · Alcance: solo lectura.
>
> Método: lectura de archivos del repo, `git log` y análisis de `package-lock.json`. Las pruebas de
> resolución de dependencias (npm sin `--legacy-peer-deps`, npm con `overrides`, `pnpm import`) se
> hicieron sobre **copias** de los `package.json` y del lockfile en un directorio temporal fuera del
> repo. En el repo no se ejecutó ningún `install` y no se tocó ningún lockfile.
> `node_modules` no está instalado en este entorno, así que todo lo que depende del código
> instalado de un paquete está marcado como **Sin verificar**.

---

## 0. Correcciones al contexto de partida

Antes del informe, tres premisas del brief no coinciden con el repo:

| Premisa del brief                       | Realidad en el repo                                                                                                                                                                                                                                                       | Fuente                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| "CI en Bitbucket Pipelines"             | `bitbucket-pipelines.yml` **ya no existe**. Se eliminó en el commit `8ec48a3` (`chore(ci): migrate from bitbucket pipelines to github actions`). Hoy el CI está en GitHub Actions y Vercel despliega con su integración nativa de GitHub.                                       | `.github/workflows/ci.yml`, `.github/workflows/security.yml`, `git show 8ec48a3` |
| "`apps/web` (público, SEO)"             | `apps/web` corre con `ssr: false`, es decir, como SPA pura. Así no hay HTML renderizado en servidor y el SEO real es mínimo. Ya figura como deuda conocida: se cree que fue un workaround por un conflicto de `h3`.                                                       | `apps/web/nuxt.config.ts:5`, `.ai/project/architecture.md` ("Known architecture caveats") |
| "`--legacy-peer-deps` en todas las instalaciones" | Es cierto, pero el conflicto real **no es entre vue-router v4 y v5 como tales**. Lo causa un solo paquete, `@vercel/analytics@2.0.1`, que declara un peer opcional `vue-router@^4`. Se resuelve sin `--legacy-peer-deps` y sin cambiar de gestor (ver §2). | Reproducido, ver §2                                                         |

Esto cambia el plan: el conflicto de vue-router **no es un argumento a favor de pnpm**, porque npm lo resuelve igual.

---

## 1. Estado actual

### 1.1 Gestor de paquetes, lockfiles y versiones

| Aspecto                  | Valor                                                                                         | Fuente                                         |
| ------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Gestor                   | npm (workspaces)                                                                              | `package.json` (`workspaces`)                  |
| Lockfiles                | Solo `package-lock.json` en la raíz, `lockfileVersion: 3`. No hay `pnpm-lock.yaml` ni `yarn.lock`. No hay lockfiles anidados (el de `scripts/catalog-agent/` se eliminó en `8ec48a3`). | `package-lock.json`, búsqueda en el repo         |
| `workspaces`             | `["apps/*", "layers/*"]`                                                                       | `package.json:5-8`                             |
| Workspaces reales        | Solo `apps/web` (nombre `mundopekes`) y `apps/admin` (`mundopekes-admin`). **`layers/*` no tiene `package.json`**, así que npm ignora ese glob: los layers no son paquetes. | `package-lock.json` (`packages[""]`, `apps/web`, `apps/admin`) |
| `.npmrc`                 | `legacy-peer-deps=true` (es la única línea)                                                    | `.npmrc`                                       |
| Node                     | `.nvmrc` = `22.19.0`; `engines.node` = `22.x` en la raíz, en web y en admin                    | `.nvmrc`, `package.json`, `apps/*/package.json` |
| npm                      | No está fijado: no hay `packageManager` ni `engines.npm`. Se usa el npm que trae Node 22 (10.9.x). | `package.json`                                  |
| CI Node                  | `actions/setup-node@v4` con `node-version: 22`, que toma el último 22.x y no lee `.nvmrc`       | `.github/workflows/ci.yml`                     |

### 1.2 Cómo se conectan apps y layers

- Las dos apps extienden los layers por **ruta relativa**, no como paquetes:
  `extends: ['../../layers/core', '../../layers/ui', '../../layers/domain']`
  (`apps/web/nuxt.config.ts:6`, `apps/admin/nuxt.config.ts:2`).
- `apps/web/nuxt.config.ts:1` importa directamente `../../layers/domain/config/locales` para construir la lista de locales de i18n.
- Los layers registran módulos que **cada app tiene que declarar por su cuenta**: `layers/core` usa `@nuxt/image` y `layers/ui` usa `@nuxt/ui` (`layers/core/nuxt.config.ts`, `layers/ui/nuxt.config.ts`). Ya hubo un incidente en Vercel por esto (`docs/ci-cd-troubleshooting.md`, entrada 2026-08-09).
- El código de los layers usa `~/types/database.types` (`layers/domain/server/utils/rate-limit.ts:2`). Dentro de un layer, `~` apunta al `srcDir` de **la app que consume el layer**, así que ese import usa la copia de la app, no la de `layers/core`.

### 1.3 Scripts

**Raíz** (`package.json`):

| Script                                                | Comando                                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `dev:web` / `dev:admin`                               | `npm run dev --workspace=apps/web -- --host` / `npm run dev --workspace=apps/admin` |
| `build:web` / `build:admin`                           | `npm run build --workspace=apps/…`                                               |
| `test:web` / `test:admin`                             | `npm run test --workspace=apps/…`                                                |
| `lint`                                                | `eslint .`                                                                       |
| `format`                                              | `prettier --write .`                                                             |
| `commit`                                              | `cz`                                                                             |
| `security:check`                                      | Tres `snyk test` separados (raíz, web, admin)                                    |
| `security:monitor`                                    | `snyk monitor --all-projects`                                                    |
| `prepare`                                             | `node -e "…if(process.env.CI!=='1')execSync('husky')"`                         |

**`apps/web/package.json`**: `build`, `dev`, `generate`, `preview`, `postinstall: nuxt prepare`, `test: vitest run`.
**`apps/admin/package.json`**: `build`, `dev`, `preview`, `postinstall: nuxt prepare`, `lint: eslint .`, `typecheck: nuxt typecheck`, `test: vitest run`.

Puntos a tener en cuenta:

- El `postinstall` de cada app corre `nuxt prepare` en cada instalación. pnpm cambia el orden y el paralelismo de los scripts de ciclo de vida, y pnpm ≥10 **bloquea los scripts de dependencias** por defecto (no los de los workspaces propios). Ver §5.
- La raíz tiene **dependencias de runtime** (`@nuxt/image`, `@vercel/analytics`, `h3`, `resend`). Además de `overrides` de seguridad, tiene un `h3` fijado a `1.15.11` en `dependencies` y en `overrides`, relacionado con el workaround de `ssr: false` (`.ai/project/architecture.md`).

### 1.4 Hooks y commits

| Elemento   | Configuración                                                                     | Fuente                  |
| ---------- | --------------------------------------------------------------------------------- | ----------------------- |
| Husky      | v9.1.7, se instala vía `prepare`, que se salta cuando `CI=1`                       | `package.json`          |
| pre-commit | `npx lint-staged --no-stash`                                                      | `.husky/pre-commit`     |
| commit-msg | `npx --no -- commitlint --edit $1`                                                | `.husky/commit-msg`     |
| pre-push   | Eliminado en `8ec48a3` (lint y Snyk pasaron al CI)                                | `git show 8ec48a3`      |
| commitlint | `extends: ['@commitlint/config-conventional']`                                    | `commitlint.config.cjs` |
| lint-staged | `*.{ts,vue}` → `eslint --fix` + `prettier --write`; `*.{json,md}` → `prettier --write` | `package.json`          |
| Commitizen | `npm run commit` → `cz`, adapter `cz-conventional-changelog`                      | `package.json` (`config.commitizen`) |

Los hooks usan `npx`, y `npx` resuelve desde `node_modules/.bin` de la raíz. Con pnpm siguen funcionando porque commitlint y lint-staged son devDependencies de la raíz y pnpm crea sus binarios en `node_modules/.bin` raíz.

### 1.5 CI (GitHub Actions)

`.github/workflows/ci.yml` (push a `main`/`dev` y en PRs):

1. `actions/setup-node@v4` con `node-version: 22` y `cache: npm`
2. `npm ci --legacy-peer-deps`
3. `cd apps/admin && npx nuxt prepare` y luego `cd ../web && npx nuxt prepare`. Es redundante con el `postinstall`, pero inofensivo.
4. `npm run lint`
5. `npm run test:web -- --run` y `npm run test:admin -- --run` (el `--run` es redundante: el script ya es `vitest run`)

No hay **build** de web ni de admin en el CI, y tampoco typecheck. Un error de build solo aparece en Vercel.

`.github/workflows/security.yml`: `npm ci --legacy-peer-deps` y luego `npx snyk test --all-projects --severity-threshold=high`. Corre en push, en PRs, cada lunes y a mano.

### 1.6 Deploy (Vercel)

- `vercel.json` en la **raíz**: `{ "version": 2, "installCommand": "npm ci --legacy-peer-deps" }`. Ninguna app tiene `vercel.json` propio.
- `docs/ci-cd-troubleshooting.md` dice que cada proyecto de Vercel usa como Root Directory `apps/web` o `apps/admin`. **Sin verificar**: Vercel lee `vercel.json` desde el Root Directory configurado. Si el Root Directory es `apps/web`, el `vercel.json` de la raíz **no aplicaría**, y el `installCommand` efectivo sería el configurado en el dashboard. El historial (`be42c91`) indica que cambiarlo arregló un fallo, lo que sugiere que sí se lee. Hay que confirmar cuál es la fuente real.
- Variables de entorno (`DEEPL_API_KEY`, `GOOGLE_PLACES_API_KEY`, `SUPABASE_*`) viven en el dashboard de Vercel: **Sin verificar**.

### 1.7 Otros hallazgos colaterales (fuera de alcance, pero relevantes)

- `apps/admin/renovate.json` es un resto de la plantilla del dashboard de Nuxt: extiende `nuxt/renovate-config-nuxt` y usa `postUpdateOptions: ["pnpmDedupe"]` en un repo npm. **Sin verificar** si Renovate está activo.
- `apps/web/nuxt.config.ts:26` usa `supabase.types: './types/database.types.ts'`, pero el archivo está en `apps/web/app/types/`. **Sin verificar** cómo resuelve esa ruta `@nuxtjs/supabase` (¿relativa a `rootDir` o a `srcDir`?). Si es a `rootDir`, apunta a un archivo que no existe y el cliente de Supabase en web queda sin tipar. Admin usa `~/types/...`, que sí es correcto.
- `.prettierignore` excluye las dos copias de `database.types.ts` de las apps, pero **no** la de `layers/core`. Por eso la copia del layer está formateada con Prettier y las otras no (ver §4).

---

## 2. Conflicto de vue-router

### 2.1 Causa exacta (reproducida)

Al quitar `legacy-peer-deps` y correr `npm install --package-lock-only --ignore-scripts` sobre una copia del repo, npm falla así:

```
npm error ERESOLVE could not resolve
npm error While resolving: @vercel/analytics@2.0.1
npm error Found: vue-router@5.3.1
npm error   peerOptional vue-router@"^4.5.0 || ^5.0.0" from @nuxt/ui@4.11.0
npm error   vue-router@"^5.2.0" from @nuxtjs/i18n@10.6.0
npm error   2 more (nuxt, mundopekes)
npm error Could not resolve dependency:
npm error peerOptional vue-router@"^4" from @vercel/analytics@2.0.1
```

| Paquete                       | Pide vue-router                       | Tipo                | Fuente (`package-lock.json`)           |
| ----------------------------- | ------------------------------------- | ------------------- | -------------------------------------- |
| `nuxt@4.5.2`                  | `^5.2.0`                              | dependency          | `node_modules/nuxt`                    |
| `@nuxtjs/i18n@10.6.0`         | `^5.2.0`                              | dependency          | `node_modules/@nuxtjs/i18n`            |
| `apps/web` (`mundopekes`)     | `^5.0.3`                              | dependency directa  | `apps/web/package.json`                |
| `@nuxt/ui@4.11.0`             | `^4.5.0 \|\| ^5.0.0`                  | peer opcional       | `node_modules/@nuxt/ui`                |
| **`@vercel/analytics@2.0.1`** | **`^4`**                              | **peer opcional**   | `node_modules/@vercel/analytics`       |

**Versión instalada:** una sola, `vue-router@5.3.1` en `node_modules/vue-router`. No hay copias anidadas de v4.

**Por qué falla:** desde npm 7, un peer opcional *que está presente* tiene que cumplir su rango. `vue-router@5` está en el árbol porque lo traen Nuxt e i18n, y no cumple `^4`, así que npm aborta. `--legacy-peer-deps` hace que npm ignore **todos** los peers del árbol, no solo este. Eso oculta cualquier otro conflicto real que aparezca en el futuro.

**Riesgo funcional real:** bajo. `@vercel/analytics` solo usa vue-router para leer la ruta actual (integración Nuxt/Vue), y la API usada es compatible en v5. **Sin verificar** en runtime: hay que confirmar en producción que los page views de Vercel Analytics registran la ruta correcta al navegar del lado del cliente.

`@vercel/analytics@2.0.1` es la última versión estable. `@vercel/analytics@2.3.0-canary` ya declara `vue-router: '^4 || ^5'` (`npm view`), así que el arreglo upstream está en camino.

### 2.2 Opciones de solución

| #     | Opción                                                                                                                                                                                                                 | Gestor | Verificado                                                                                    | Valoración                                                                                       |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| A     | `overrides: { "@vercel/analytics": { "vue-router": "$vue-router" } }` en el `package.json` raíz, más `vue-router` como dependencia directa de la raíz (`$ref` lo exige), y eliminar `legacy-peer-deps` de `.npmrc`, `vercel.json` y los dos workflows | npm    | **Sí**: con esto `npm install --package-lock-only` resolvió sin errores (1961 paquetes) y sin más conflictos de peers ocultos | **Recomendada**, se haga o no la migración a pnpm. Acota la excepción a un solo paquete.              |
| B     | `pnpm.peerDependencyRules.allowedVersions: { "@vercel/analytics>vue-router": "5" }` (en `pnpm-workspace.yaml` con pnpm ≥10)                                                                                            | pnpm   | Parcial: `pnpm import` solo da **warning**, no error (pnpm tiene `strict-peer-dependencies=false` por defecto) | Equivalente a A para pnpm. Silencia el warning de forma explícita y documentada.                   |
| C     | Esperar a `@vercel/analytics` ≥2.1 estable (`^4 \|\| ^5`) y subir la versión                                                                                                                                            | ambos  | Solo está en canary                                                                           | Es la solución definitiva. Cuando salga, se elimina A/B.                                              |
| D     | Seguir con `--legacy-peer-deps`                                                                                                                                                                                          | npm    | Es el estado actual                                                                            | Rechazada: desactiva la validación de peers en todo el árbol.                                            |

---

## 3. Inventario de candidatos a `packages/`

Criterio: lo que va a `packages/` debe ser TypeScript puro (sin `vue`, `nuxt`, `#imports`, `h3`, `#supabase/*`).

| Elemento                                                                                  | Ubicación actual                                                                                                                         | Paquete destino                         | ¿Depende de Vue/Nuxt?                                                                          | Notas                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Database`, `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `Json`, `Constants`         | `apps/web/app/types/database.types.ts`, `apps/admin/app/types/database.types.ts`, `layers/core/types/database.types.ts`                  | `packages/types`                        | No                                                                                             | Las 3 copias son semánticamente idénticas (§4). Generación manual con Supabase CLI: no hay script en ningún `package.json` y hay `supabase/.temp/project-ref` (proyecto enlazado). Hay ~35 imports `~/types/database.types` en admin y 3 en web. También se usa en `supabase.types` (`apps/*/nuxt.config.ts`).                                                                    |
| `ContactIntent`                                                                           | `layers/domain/types/contact.ts` **y** `apps/web/app/types/contact.ts` (duplicado)                                                        | `packages/types`                        | No                                                                                             | Además está repetido como `z.enum([...])` en `apps/web/server/api/contact/index.post.ts:8`. Debería derivarse del esquema Zod.                                                                                                                                                                                 |
| `LocaleTranslationStatus`, `LocaleStatusEntry`, `FieldI18nStatus`                          | `layers/domain/types/i18n-status.ts`                                                                                                     | `packages/types`                        | No                                                                                             | También se usa en `translation-service.ts`.                                                                                                                                                                                                                                                                 |
| `ScheduleDay`, `WizardSchedule`, `SCHEDULE_DAYS`, `defaultSchedule`, `mergeSchedule`       | `layers/domain/types/schedule.ts`                                                                                                        | `packages/types` (o `packages/schemas`) | No                                                                                             | `WizardSchedule` está duplicado como esquema Zod en `apps/web/server/api/suggestions/index.post.ts:9-25`. Lo ideal es que el tipo salga de `z.infer` del esquema compartido.                                                                                                                                 |
| `ACTIVITY_BADGE_KEYS`, `ActivityBadgeKey`, `ActivityBadgeSource`                           | `layers/domain/config/badges.ts`                                                                                                         | `packages/types`                        | No                                                                                             | Es una constante de dominio pura.                                                                                                                                                                                                                                                                        |
| `SOURCE_LOCALE`, `CONTENT_LOCALE_META`, `CONTENT_LOCALES`, `ContentLocale`                 | `layers/domain/config/locales.ts`                                                                                                        | `packages/i18n`                         | No                                                                                             | `apps/web/nuxt.config.ts:1` la importa por ruta relativa. Es la fuente única de los locales de contenido.                                                                                                                                                                                                    |
| `useActivityBadges()`                                                                      | `layers/domain/composables/useActivityBadges.ts`                                                                                          | `packages/types` (como `getActivityBadges`) | No en la práctica: es una función pura con prefijo `use`                                       | Hay que renombrarla al moverla (no es un composable). El layer puede mantener un re-export `useActivityBadges`.                                                                                                                                                                                          |
| `summarizeI18nStatus()`                                                                    | `layers/domain/utils/i18n-status.ts`                                                                                                     | `packages/i18n` (o un futuro `packages/domain`) | No                                                                                             | Tiene tests en `apps/admin/tests/unit/i18n-status.test.ts`.                                                                                                                                                                                                                                                     |
| `parseGoogleHoursToSchedule()`                                                             | `layers/domain/utils/schedule-mapping.ts`                                                                                                | Futuro `packages/domain`                | No                                                                                             | Es lógica de dominio. Por la regla "negocio en NestJS" debería ir a `apps/api` (Fase 3 del proyecto), no a un paquete de UI.                                                                                                                                                                                                  |
| `places-logic.ts` (`VALID_LANGS`, `GOOGLE_TYPES_MAP`, `build*Url`, `map*`)                 | `layers/domain/server/utils/places-logic.ts`                                                                                             | `apps/api` (futuro)                     | No (el propio archivo lo declara)                                                              | **No** mover a `packages/`: construye URLs con la API key de Google. Es código de servidor. `VALID_LANGS` duplica `CONTENT_LOCALES`.                                                                                                                                                                                      |
| `normalizeName()`                                                                          | `layers/domain/server/utils/duplicate-detection.ts:8`                                                                                    | `packages/schemas` (helper) o `apps/api` | No (el resto del archivo usa `SupabaseClient`)                                                  | Solo la función pura `normalizeName` es portable.                                                                                                                                                                                                                                                          |
| `escapeHtml()`, `sanitizeHttpUrl()`                                                         | `layers/core/server/utils/html.ts`, `layers/core/server/utils/url.ts`                                                                     | `apps/api` (futuro) / mantener          | No                                                                                             | Son puras, pero solo tienen sentido en servidor (salida de email/HTML). No las necesita mobile.                                                                                                                                                                                                                   |
| `translation-service.ts` (`DeepLProvider`, `translateI18nField`)                            | `layers/domain/server/services/translation-service.ts`                                                                                   | `apps/api` (Fase 3)                     | No (usa `fetch` global)                                                                         | **No** va a `packages/`: maneja la API key de DeepL y es lógica de negocio.                                                                                                                                                                                                                                    |
| `log`, `logError`, `checkRateLimit`                                                         | `layers/core/server/utils/logger.ts`, `layers/domain/server/utils/rate-limit.ts`                                                          | Se queda en el layer / `apps/api`       | **Sí** (`h3`, `#supabase/server`, `createError`)                                                | No portable.                                                                                                                                                                                                                                                                                              |
| Esquema de contacto (`intent`, `name`, `email`, `message`, `activityId`, …)                | `apps/web/server/api/contact/index.post.ts:7-15`                                                                                         | `packages/schemas`                      | No (el esquema; el handler sí)                                                                 | Hoy solo valida en backend. Con un paquete compartido sirve para la validación en vivo del formulario en el frontend y en mobile.                                                                                                                                                                                                |
| Esquema de alta de proveedor (`dayScheduleSchema`, `bodySchema`)                           | `apps/web/server/api/providers/index.post.ts:6-40`                                                                                       | `packages/schemas`                      | No                                                                                             | Usa `z.string().email()`/`.url()`, deprecados en Zod 4 (`z.email()`/`z.url()`). Funcionan, pero conviene migrarlos al moverlos.                                                                                                                                                                                       |
| Esquema de sugerencias (`scheduleDaySchema`, `wizardScheduleSchema`, `newActivitySchema`, `existingActivitySchema`, `newPlaceSchema`, `existingPlaceSchema`, `bodySchema`) | `apps/web/server/api/suggestions/index.post.ts:9-100`                                                                                    | `packages/schemas`                      | No                                                                                             | Es el esquema más grande y valioso. Hay mensajes de error en español hardcodeados (`'El tipo de actividad es requerido'`, `'place_id inválido'`), que tienen que pasar a claves i18n o códigos de error.                                                                                                                       |
| Esquema de tracking (`VALID_EVENT_TYPES`, `bodySchema`)                                    | `apps/web/server/api/track.post.ts:5-27`                                                                                                 | `packages/schemas`                      | No                                                                                             | `VALID_EVENT_TYPES` debería ser una constante exportada, porque admin la usa en analytics (`apps/admin/server/api/user-events/*`).                                                                                                                                                                                              |
| Esquema de cambio de estado de proveedor                                                    | `apps/admin/server/api/providers/[id].patch.ts:6-9`                                                                                      | `packages/schemas`                      | No                                                                                             | `status` duplica el enum `provider_status` de `database.types.ts`. Debería derivarse de `Constants.public.Enums.provider_status`.                                                                                                                                                                                     |
| Esquemas de formulario de admin (`customers/AddModal`, `settings/index`, `settings/security`) | `apps/admin/app/components/customers/AddModal.vue`, `apps/admin/app/pages/settings/index.vue`, `apps/admin/app/pages/settings/security.vue` | No migrar                               | Sí (dentro de SFC, usan `t()` para los mensajes)                                                | Son restos de la plantilla del dashboard (customers/settings demo). **Sin verificar** si se usan de verdad. Candidatos a borrar, no a compartir.                                                                                                                                                                                 |
| Traducciones de web (es/en/he/ru)                                                          | `apps/web/i18n/locales/{es,en,he,ru}.json`                                                                                              | `packages/i18n/web/`                    | No (son JSON)                                                                                  | 315 claves por locale, completas en los 4 locales.                                                                                                                                                                                                                                                                     |
| Traducciones de admin (es/en)                                                              | `apps/admin/i18n/locales/{es,en}.json`                                                                                                   | `packages/i18n/admin/`                  | No (son JSON)                                                                                  | 798 claves, completas en es/en. **No hay he/ru** para admin: el objetivo ES/EN/HE/RU solo se cumple en web.                                                                                                                                                                                                             |
| Configuración TS base                                                                      | `apps/web/tsconfig.json`, `apps/admin/tsconfig.json` (idénticos, solo referencias a `.nuxt/tsconfig.*.json`)                              | `packages/config/tsconfig`              | No                                                                                             | No hay `tsconfig` en la raíz. Las apps deben seguir usando el tsconfig que genera Nuxt. `packages/config` aporta un `tsconfig.base.json` estricto para los **paquetes** puros (y para `apps/api`/`apps/mobile` más adelante).                                                                                                          |
| Reglas ESLint comunes                                                                      | `eslint.config.mjs` (raíz) y `apps/admin/eslint.config.mjs`                                                                               | `packages/config/eslint`                | Parcial: las reglas `vue/*` sí; las reglas TS/`@stylistic` no                                  | Las ~20 reglas están **copiadas casi literalmente** en los dos archivos. Admin además desactiva `vue/no-multiple-template-root` y `vue/html-closing-bracket-newline`, y configura `stylistic` desde `apps/admin/nuxt.config.ts` (`eslint.config.stylistic`). Conviene exportar un bloque `base` (TS) y un bloque `vue` aparte. |
| Prettier                                                                                   | `.prettierrc` (raíz)                                                                                                                    | Se queda en la raíz o va a `packages/config/prettier` | No                                                                                             | Ya está centralizado. Moverlo aporta poco (80/20: dejarlo).                                                                                                                                                                                                                                         |

### 3.1 i18n: cómo se carga hoy y duplicados

- **web**: `locales: [...CONTENT_LOCALE_META]` (`es.json`, `en.json`, `ru.json`, `he.json`), `langDir: 'locales'`, `defaultLocale: 'he'`, `strategy: 'no_prefix'` (`apps/web/nuxt.config.ts`, bloque `i18n`). Con `@nuxtjs/i18n` v10, `langDir` se resuelve respecto a `<rootDir>/i18n/`, por eso los archivos están en `apps/web/i18n/locales/`.
- **admin**: `es`/`en` inline, `langDir: 'locales'`, `defaultLocale: 'es'`, `strategy: 'no_prefix'` (`apps/admin/nuxt.config.ts`, bloque `i18n`).
- `lazy`: ninguna app lo configura. En `@nuxtjs/i18n` v10 (instalada 10.6.0) la opción `lazy` ya no existe y los mensajes de locales con `file` se cargan siempre de forma diferida. **Sin verificar** contra el código instalado, porque no hay `node_modules`.
- No hay `i18n.config.ts` en ninguna app.
- **Claves duplicadas entre web y admin:** solo `nav.categories` coincide en clave y en valor. Las namespaces de primer nivel son disjuntas salvo `nav`. Lo que sí se repite son **valores**: 77 cadenas ES idénticas con claves distintas (p. ej. "Cancelar" ×10 en admin, estaciones, rangos de edad, "Gratis", "Ciudad", "Categoría"). Dentro de admin también hay duplicación interna (`entityForm.seasonLabels.*`, `activitiesSlideover.seasonLabels.*`, `suggestionsSlideover.seasonLabels.*`).
- Componentes de `layers/ui` usan claves propias (`t('close')` en `EntitySlideover.vue`, `t('selected')`/`t('clear')` en `PlaceSearch.vue`). **Sin verificar** si se definen con `useI18n({ messages })` local o si dependen de las claves de la app.

**Conclusión i18n:** compartir un único JSON entre web y admin ahorra muy poco, porque los catálogos son disjuntos. El valor real de `packages/i18n` está en: (1) un namespace `common` con vocabulario de dominio (estaciones, edades, "gratis", acciones básicas) que van a usar web, admin y **mobile**; (2) los catálogos `web` reutilizables por mobile; (3) la constante `CONTENT_LOCALE_META`. Hay que deduplicar primero en admin.

---

## 4. Diferencias entre las tres copias de `database.types.ts`

| Archivo                                  | Líneas | md5                                | Formato                                                      |
| ---------------------------------------- | ------ | ---------------------------------- | ------------------------------------------------------------ |
| `apps/web/app/types/database.types.ts`   | 963    | `b38ed16e446a8b931c34d020ea9bea67` | Salida tal cual de Supabase CLI (comillas dobles)              |
| `apps/admin/app/types/database.types.ts` | 963    | `795c57ead508f5fd514069a998cf46c4` | Comillas simples (formateado parcialmente)                     |
| `layers/core/types/database.types.ts`    | 951    | `1056fac9029364918a987233ff15bdac` | Formateado con Prettier (`printWidth: 100`, comillas simples) |

**Resultado del diff semántico** (normalizando comillas, espacios y comas finales):

- **web ≡ admin**: idénticos. Solo cambian las comillas.
- **web ≡ layers/core**: idénticos en contenido. La única diferencia es que Prettier quitó el `|` inicial de 4 uniones de tipos multilínea (`Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes`), y además colapsó `Json` en una línea. No hay ninguna diferencia de tablas, columnas, enums ni funciones.
- Las tres copias se actualizaron en los mismos 5 commits (el último es `0a4f5a5`, 2026-09-13). Se regeneran a mano y en bloque.

**Por qué difieren en formato:** `.prettierignore` solo excluye las dos copias de las apps. La de `layers/core` pasa por `prettier --write` (lint-staged) y queda reformateada. ESLint ignora las tres (`eslint.config.mjs`: `'**/database.types.ts'`).

**Cómo se generan:** no hay script `supabase gen types` en ningún `package.json`. Existe `supabase/.temp/` con `project-ref`, `linked-project.json` y `cli-latest` (`v2.116.0`), lo que confirma uso local de Supabase CLI enlazado al proyecto. **Sin verificar** el comando exacto (¿`supabase gen types typescript --linked`?, ¿se copia a mano a las 3 rutas?).

**Uso de la copia de `layers/core`:** ningún archivo la importa por ruta. Todos usan `~/types/database.types`, que apunta a la app. Solo puede llegar a usarse por auto-import, porque `layers/core/nuxt.config.ts` registra `imports.dirs: ['types']`. **Sin verificar** si los tipos `Database`/`Tables`/`Json` aparecen como auto-imports globales en `.nuxt/types/imports.d.ts` y si chocan con los imports explícitos.

---

## 5. Evaluación: pnpm workspaces vs npm workspaces

### 5.1 Prueba empírica (copia aislada, fuera del repo)

`pnpm import` (pnpm 10.18.0) generó un `pnpm-lock.yaml` a partir del `package-lock.json` actual, sin errores (1831 paquetes). Los únicos avisos de peers fueron:

```
nuxt 4.5.2 > @nuxt/cli 3.37.0 > @bomb.sh/tab 0.0.19  ✕ unmet peer cac@^6.7.14: found 7.0.0
apps/web > @vercel/analytics 2.0.1                    ✕ unmet peer vue-router@^4: found 5.3.1
```

Los dos son warnings, no errores. **No** se probó `pnpm install` completo ni `nuxt build` con la estructura estricta de `node_modules` (eso sería implementación).

### 5.2 Dependencias fantasma detectadas

Son imports que funcionan hoy **solo gracias al hoisting de npm**. Con pnpm (estructura aislada) fallarían:

| Import no declarado     | Dónde se usa                                                                                                   | Declarado en                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `zod`                   | `apps/web/server/api/{contact,providers,suggestions}/…`, `apps/web/server/api/track.post.ts`                  | Solo `apps/admin/package.json`                              |
| `vue-i18n`              | `apps/web/app/composables/useI18nContent.ts`                                                                   | Ninguno (llega transitivamente por `@nuxtjs/i18n`)              |
| `leaflet`               | `apps/web/app/components/activity/InfoLocation.vue`, `apps/web/app/components/search/MapView.vue`             | Ninguno (llega transitivamente por `@nuxtjs/leaflet`)           |
| `vite` (tipos)          | `apps/web/vitest.config.ts`                                                                                    | Ninguno                                                      |
| `h3`                    | `apps/web/server/utils/logger.ts`, tests de web y admin, `layers/core/server/utils/logger.ts`, `layers/domain/server/api/places/*` | Solo la raíz                                                 |
| `@supabase/supabase-js` | `apps/admin/server/api/admin/translate-existing.post.ts`, `apps/admin/server/api/reference.get.ts`, `apps/admin/server/utils/activity-pivots.ts`, `layers/domain/server/utils/duplicate-detection.ts` | Ninguno (llega transitivamente por `@nuxtjs/supabase`)          |
| `vue-router`            | `apps/admin/app/pages/business-report.vue`                                                                     | Solo `apps/web/package.json`                                |
| `@nuxt/eslint-config`, `@stylistic/eslint-plugin` | `eslint.config.mjs` (raíz)                                                              | La raíz solo declara `@nuxt/eslint`                          |

Hay además **rutas hardcodeadas al `node_modules` hoisteado**:
`apps/web/vitest.config.ts` y `apps/admin/vitest.config.ts` hacen alias de `#supabase/server` a `../../node_modules/@nuxtjs/supabase/dist/runtime/server/services/index.js`. Con pnpm, `@nuxtjs/supabase` es dependencia de cada app y **no** existe en `node_modules/` de la raíz, así que los tests romperían.

Y los **layers no tienen `package.json`**. Sus imports (`h3`, `@supabase/supabase-js`) se resuelven subiendo directorios desde `layers/<x>/` hasta el `node_modules` de la raíz. Con pnpm la raíz solo tiene sus propias dependencias. **Sin verificar** si Nuxt/Nitro/Vite resuelven esos imports desde el `modulesDir` de la app consumidora (Nuxt añade `<app>/node_modules` a `modulesDir`, pero Vite y Rollup resuelven según la ruta del archivo que importa). La solución robusta es convertir cada layer en un workspace con su propio `package.json` y sus dependencias.

Estos fallos son **exactamente** el tipo de bug que ya rompió Vercel en agosto (`docs/ci-cd-troubleshooting.md`, "`@nuxt/image` no resuelve en admin"). pnpm los convierte en errores locales inmediatos en vez de sorpresas en el deploy.

### 5.3 Ganancias y riesgos

| Aspecto                                        | pnpm workspaces                                                                                                                                                                                                                                                                          | npm workspaces (quedarse)                                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Dependencias fantasma (§5.2)                   | **Ganancia principal.** El aislamiento obliga a declarar cada dependencia por workspace. Así el entorno local se parece a la instalación por proyecto de Vercel.                                                                                                                              | Siguen ocultas. Hay que mantener a mano el checklist de `docs/ci-cd-troubleshooting.md`.                                   |
| Conflicto vue-router                           | `peerDependencyRules.allowedVersions`. Además, pnpm por defecto solo avisa.                                                                                                                                                                                                         | `overrides` + `$vue-router` (**verificado**, §2.2-A). **Empate.**                                                               |
| Referencias a `packages/*`                     | Protocolo `workspace:*`: falla si el paquete no existe en el workspace, nunca baja uno homónimo del registry.                                                                                                                                                                     | `"@mundopekes/types": "*"` funciona por symlink, pero si el nombre no coincide con un workspace, npm lo busca en el registry público (riesgo de dependency confusion si alguien publica `@mundopekes/*`). Se mitiga reservando el scope en npm. |
| Velocidad y disco                              | Store global con hardlinks. Instalaciones más rápidas, sobre todo con caché.                                                                                                                                                                                                       | Más lento y duplica en disco. Con 2 apps, la diferencia es moderada.                                                     |
| Seguridad de scripts                           | pnpm ≥10 no ejecuta `postinstall` de dependencias salvo los listados en `onlyBuiltDependencies`. Reduce la superficie de ataque de la cadena de suministro. Contrapartida: hay que listar a mano `sharp`, `esbuild`, `@parcel/watcher`, `vue-demi`, etc.                                           | Ejecuta todos los scripts.                                                                                                    |
| `overrides` de seguridad (11 paquetes)          | Se trasladan a `pnpm.overrides` / `overrides` en `pnpm-workspace.yaml`. Misma semántica. Hay que revisar `"esbuild": "^0.28.1"` (rango) y `"nanoid": "3.3.18"` (fija la v3 incluso para quien pida v5).                                                                                                 | Sin cambios.                                                                                                                  |
| Nuxt / Nuxt UI / módulos                       | Nuxt 4 y Nuxt UI 4 tienen soporte oficial en pnpm (la plantilla de admin viene de un repo pnpm: `apps/admin/renovate.json`). Riesgo: los módulos que inyectan imports de dependencias transitivas en el código de runtime (p. ej. `@nuxt/ui` → `reka-ui`, `tailwind-variants`; `@nuxtjs/i18n` → `vue-i18n`). Nuxt suele resolverlos, pero **Sin verificar** sin un build. Si algo falla, se usa `public-hoist-pattern[]` puntual en `.npmrc`, **nunca** `shamefully-hoist=true`. | Funciona hoy.                                                                                                                |
| Layers sin `package.json`                      | **Riesgo alto** (§5.2). Requiere convertirlos en workspaces (`layers/*` ya está en el glob) y que las apps los consuman como `workspace:*` o por ruta relativa, igual que hoy.                                                                                                                        | Funciona por hoisting.                                                                                                       |
| Vitest (`../../node_modules/@nuxtjs/supabase`) | **Rompe.** Hay que cambiar el alias por `require.resolve('@nuxtjs/supabase/…')` o por la ruta de la propia app.                                                                                                                                                                                | Funciona.                                                                                                                     |
| Husky / commitlint / Commitizen                | Se mantienen. `prepare` sigue corriendo (es un script de la raíz). `npx` en los hooks resuelve igual. `npm run commit` pasa a ser `pnpm commit`. Si alguien sigue usando `npm run commit`, funciona si npm está instalado, pero `npm install` estaría prohibido (`only-allow pnpm` en `preinstall`; requiere aprobar el paquete `only-allow`, o se hace con un script `node -e` sin dependencias). Hay que actualizar `COMMITS.txt`. | Sin cambios.                                                                                                                  |
| GitHub Actions                                 | Añadir `pnpm/action-setup` (o `corepack enable`) antes de `setup-node`, `cache: pnpm`, `pnpm install --frozen-lockfile`, y `pnpm --filter` en los scripts.                                                                                                                              | Sin cambios.                                                                                                                  |
| Vercel                                         | Detecta pnpm por `pnpm-lock.yaml` y elige la versión según el `lockfileVersion` o el campo `packageManager` (este requiere `ENABLE_EXPERIMENTAL_COREPACK=1`). Hay que cambiar `installCommand` en `vercel.json` y, **Sin verificar**, los overrides de Install Command del dashboard. **Sin verificar** que Vercel soporte la última versión mayor de pnpm (12.x existe a esta fecha). Recomiendo fijar 10.x. | Sin cambios.                                                                                                                  |
| Windows / PowerShell                           | `corepack enable` escribe en el directorio de instalación de Node y suele requerir **PowerShell como administrador** (alternativa: `npm i -g pnpm@10`). pnpm usa *junctions* en Windows, así que no requiere modo desarrollador. Riesgo de rutas largas (`node_modules/.pnpm/...`): conviene `git config core.longpaths true` y Windows con LongPathsEnabled. El antivirus (Defender) ralentiza el store: se puede excluir `%LOCALAPPDATA%\pnpm\store`. El store y el repo deben estar en el **mismo disco** para que funcionen los hardlinks; si no, pnpm copia. | Sin cambios.                                                                                                                  |
| React Native (futuro `apps/mobile`)            | Metro soporta symlinks y Expo soporta pnpm, pero los ecosistemas RN han dado problemas con `node_modules` aislado. Puede hacer falta `node-linker=hoisted` **solo** para la app mobile o en todo el workspace. **Sin verificar** hasta que exista la app.                                         | npm hoisted es lo que Metro espera por defecto.                                                                                |
| Snyk                                           | `snyk test --all-projects` soporta `pnpm-lock.yaml`. **Sin verificar** la versión instalada (`snyk@^1.1304.0`).                                                                                                                                                                       | Sin cambios.                                                                                                                  |
| Coste de migración                             | Una fase completa (nuevo lockfile, CI, Vercel, documentación, ajustes de vitest y layers) más una curva de aprendizaje mínima.                                                                                                                                                         | Cero.                                                                                                                         |

### 5.4 Qué se pierde y qué se gana quedándose en npm

- **Se gana:** cero migración, cero riesgo en Vercel y Windows, compatibilidad directa con React Native, y la eliminación de `--legacy-peer-deps` también es posible con `overrides` (§2.2-A).
- **Se pierde:** detección automática de dependencias fantasma (seguirán apareciendo en Vercel y no en local), el protocolo `workspace:*`, la protección contra scripts de instalación de terceros, y velocidad.

### 5.5 Recomendación

**Migrar a pnpm workspaces (fijado a 10.x), pero solo después de una fase de saneamiento en npm.**

Motivo: el argumento decisivo **no** es el conflicto de vue-router (npm lo resuelve con `overrides`) ni la velocidad. Es que el repo ya tiene al menos 8 dependencias fantasma y 2 rutas hardcodeadas a `node_modules`. Es exactamente la clase de error que ya costó deploys fallidos en Vercel, y crear `packages/` va a multiplicar las fronteras entre paquetes. pnpm hace que esos errores salten en local, antes de commitear. El protocolo `workspace:*` además evita resolver `@mundopekes/*` desde el registry público.

La condición es saneamiento previo en npm (Fase 1B): declarar las dependencias fantasma y aplicar los `overrides`. Así la migración a pnpm (Fase 2) se reduce a un cambio de herramienta, cada paso se revierte por separado, y si la Fase 2 sale mal, la 1B ya dejó el repo mejor que antes.

Si la prioridad es lanzar lo antes posible, la alternativa aceptable es: hacer solo la Fase 1B, quedarse en npm workspaces y reevaluar pnpm cuando exista `apps/mobile`. Esa opción sacrifica la detección automática de dependencias fantasma.

---

## 6. Plan de fases propuesto

Reglas aplicadas: una fase por sesión; las fases que modifican archivos existentes van solas; las que solo crean archivos pueden combinarse; la migración del gestor es su propia fase y va antes de `packages/`.

> Nota sobre el lockfile: añadir un workspace nuevo cambia `pnpm-lock.yaml` (nueva entrada en `importers`), aunque el paquete no tenga dependencias. Las fases de "crear" lo modifican de forma **mecánica y regenerada**, no a mano. Si consideras que eso rompe la regla de "solo archivos nuevos", hay que separar las Fases 3 y 6 en una fase por paquete (pasaríamos de 8 a 10 fases).

**Verificación estándar** (en adelante, "VE"), desde la raíz:
`install --frozen-lockfile` (o `npm ci`) limpio → `nuxt prepare` en las dos apps → `lint` (0 errores; avisos ≤ los actuales) → `test:web` y `test:admin` en verde → `build:web` y `build:admin` en verde → `nuxt typecheck` en admin (sin errores nuevos respecto a la línea base) → preview deploy en Vercel de las dos apps.

### Fase 1B — Saneamiento de dependencias en npm (modifica, va sola)

- **Objetivo:** quitar `--legacy-peer-deps` y declarar todas las dependencias fantasma sin cambiar de gestor.
- **Archivos:** `package.json` (añadir `vue-router` y `overrides["@vercel/analytics"]`; declarar `@nuxt/eslint-config` y `@stylistic/eslint-plugin`), `apps/web/package.json` (`zod`, `vue-i18n`, `leaflet`, `h3`, `@supabase/supabase-js`, `vite` en dev), `apps/admin/package.json` (`@supabase/supabase-js`, `h3` en dev, `vue-router`), `.npmrc` (borrar `legacy-peer-deps`), `vercel.json`, `.github/workflows/ci.yml`, `.github/workflows/security.yml` (quitar `--legacy-peer-deps`), `package-lock.json` (regenerado). Las versiones son las que ya están instaladas según el lockfile (§3 y §5.2), así que no se introducen versiones nuevas.
- **Verificación:** VE más `npm ls vue-router` sin `invalid`/`ERESOLVE`, más confirmar en el preview de Vercel que Vercel Analytics registra page views con la ruta correcta.
- **Reversión:** `git revert <commit>`. El lockfile anterior vuelve con el revert.

### Fase 2 — Migración a pnpm workspaces (modifica, va sola)

- **Objetivo:** cambiar el gestor a pnpm 10.x con `node_modules` aislado.
- **Archivos:** crear `pnpm-workspace.yaml` (`apps/*`, `layers/*`, `packages/*`; overrides; `onlyBuiltDependencies`; `peerDependencyRules`), `pnpm-lock.yaml` (vía `pnpm import`). Borrar `package-lock.json`. Modificar `package.json` (`packageManager: pnpm@10.x`, scripts `--workspace` → `--filter`, guard de `preinstall`, borrar `workspaces` y `overrides` porque pasan al YAML), `.npmrc` (vacío o solo `public-hoist-pattern[]` si un build lo exige), `layers/{core,domain,ui}/package.json` (nuevos, con sus dependencias reales), `apps/*/vitest.config.ts` (alias `#supabase/server` sin `../../node_modules`), `vercel.json`, `.github/workflows/*.yml` (pnpm/action-setup, `cache: pnpm`, `--frozen-lockfile`), `COMMITS.txt` y `docs/ci-cd-troubleshooting.md` (`npm run commit` → `pnpm commit`). Opcional, recomendado: añadir un paso de **build** de web y admin al CI.
- **Verificación:** VE con pnpm, más `pnpm commit` y un commit de prueba (los hooks corren), más prueba en Windows/PowerShell con instalación limpia, más preview deploy en Vercel de las dos apps.
- **Reversión:** `git revert <commit>`, borrar `node_modules` y `layers/*/node_modules`, y `npm ci`. En Vercel, volver a poner el Install Command del dashboard si se tocó.

### Fase 3 — Crear `packages/config` + `packages/types` (solo crea, combinadas)

- **Objetivo:** que existan los dos paquetes base, todavía sin consumidores.
- **Archivos nuevos:** `packages/config/{package.json, tsconfig.base.json, eslint/base.mjs, eslint/vue.mjs}` y `packages/types/{package.json, tsconfig.json, src/database.types.ts, src/index.ts}`, más un script `gen` en `packages/types/package.json` (`supabase gen types typescript --project-id <ref> > src/database.types.ts`; el ref sale de una variable de entorno, no se hardcodea). `packages/types` exporta `Database`, `Tables*`, `Enums`, `Constants`, `Json`, más `ContactIntent`, i18n-status, schedule y badges (§3). Cambio mecánico: `pnpm-lock.yaml` (importers). El paquete expone `.ts` directamente, sin build: Nuxt/Vite y Metro lo transpilan.
- **Verificación:** `tsc --noEmit -p packages/types`, más VE (las apps no cambian: es una prueba de no regresión).
- **Reversión:** borrar `packages/config` y `packages/types`, y `pnpm install` para regenerar el lockfile.

### Fase 4 — Adoptar `packages/config` (modifica, va sola)

- **Objetivo:** eliminar la duplicación de reglas ESLint.
- **Archivos:** `eslint.config.mjs`, `apps/admin/eslint.config.mjs`, `apps/*/package.json` y `package.json` (devDependency `@mundopekes/config: workspace:*`).
- **Verificación:** `lint` con **el mismo número de errores y avisos** que antes (guardar la salida antes y después y compararlas), más VE.
- **Reversión:** `git revert`.

### Fase 5 — Adoptar `packages/types` y eliminar las 3 copias (modifica, va sola)

- **Objetivo:** una sola fuente de tipos de BD.
- **Archivos:** borrar `apps/web/app/types/database.types.ts`, `apps/admin/app/types/database.types.ts`, `layers/core/types/database.types.ts`, `layers/domain/types/{contact,i18n-status,schedule}.ts`, `apps/web/app/types/contact.ts`. Reescribir los ~40 imports `~/types/database.types` → `@mundopekes/types`, más `layers/domain/config/badges.ts` y `layers/domain/types/*` (re-exports o cambios de import). Modificar `supabase.types` en los dos `nuxt.config.ts` (y de paso corregir la ruta de web, §1.7), `.prettierignore`, `eslint.config.mjs` (ignore), `layers/core/nuxt.config.ts` (quitar `types` de `imports.dirs` si deja de tener uso), y `apps/*/package.json`.
- **Verificación:** VE más `nuxt typecheck` en admin sin errores nuevos, más `grep -r "database.types" apps layers` vacío (salvo el paquete).
- **Reversión:** `git revert`.

### Fase 6 — Crear `packages/schemas` + `packages/i18n` (solo crea, combinadas)

- **Objetivo:** que existan los esquemas Zod y los catálogos i18n compartidos, todavía sin consumidores.
- **Archivos nuevos:** `packages/schemas/{package.json, src/contact.ts, src/provider.ts, src/suggestion.ts, src/schedule.ts, src/tracking.ts, src/index.ts}` más tests Vitest por esquema. Los mensajes de error pasan a códigos o claves i18n, no a texto en español. `zod` va como dependencia del paquete y `@mundopekes/types` como `workspace:*`. `packages/i18n/{package.json, src/locales.ts (CONTENT_LOCALE_META…), src/i18n-status.ts, locales/common/{es,en,he,ru}.json, locales/web/*.json, locales/admin/*.json}` como **copia** de los actuales (sin borrar los originales todavía). Cambio mecánico: `pnpm-lock.yaml`.
- **Verificación:** tests de `packages/schemas` en verde, más un script que compare claves entre locales de `packages/i18n` (claves iguales en todos), más VE.
- **Reversión:** borrar los dos directorios y `pnpm install`.

### Fase 7 — Adoptar `packages/schemas` (modifica, va sola)

- **Objetivo:** que los endpoints validen con los esquemas compartidos; que el frontend pueda reutilizarlos para la validación en vivo.
- **Archivos:** `apps/web/server/api/{contact/index.post.ts, providers/index.post.ts, suggestions/index.post.ts, track.post.ts}`, `apps/admin/server/api/providers/[id].patch.ts`, `apps/admin/server/api/user-events/*` (usar `VALID_EVENT_TYPES`), y los `package.json` de las apps (quitar `zod` directo si ya no se usa).
- **Verificación:** VE más tests de servidor existentes (`apps/web/tests/server/*`) en verde, más una prueba manual de envío de contacto, sugerencia y alta de proveedor en el preview.
- **Reversión:** `git revert`.

### Fase 8 — Adoptar `packages/i18n` (modifica, va sola)

- **Objetivo:** las apps cargan traducciones desde el paquete; se borran los JSON de las apps; `CONTENT_LOCALE_META` sale del paquete.
- **Archivos:** bloque `i18n` de `apps/web/nuxt.config.ts` y de `apps/admin/nuxt.config.ts` (y el import de la línea 1 de web), borrar `apps/*/i18n/locales/*.json`, `layers/domain/config/locales.ts` y `layers/domain/server/utils/get-configured-locales.ts` (re-export o cambio de import), y `layers/domain/composables/useContentLocales.ts`. **Riesgo a resolver en esa sesión:** cómo apunta `@nuxtjs/i18n` v10 a archivos fuera de `<rootDir>/i18n/`. Opción 1: `file` con ruta relativa que sale de `langDir`. Opción 2: un *loader* `.ts` por locale dentro de la app que importa el JSON del paquete. Opción 3: `i18n:registerModule` desde un layer. **Sin verificar** cuál soporta v10 sin romper la carga diferida.
- **Verificación:** VE más cambiar de idioma en web (es/en/he/ru, incluido RTL en he) y en admin (es/en) en el preview, más cero claves faltantes en consola.
- **Reversión:** `git revert`.

**Total: 8 fases** (1B, 2, 3, 4, 5, 6, 7, 8) después de esta auditoría (1A).

---

## 7. Qué tienes que verificar tú

1. **Vercel, Root Directory** de cada proyecto (web y admin): ¿`apps/web`/`apps/admin` o la raíz? Determina si se lee `vercel.json` de la raíz (§1.6).
2. **Vercel, Install Command y Build Command** en Settings → Build & Deployment de cada proyecto: ¿hay overrides en el dashboard que pisen `vercel.json`?
3. **Vercel, versión de Node** configurada en cada proyecto (debe ser 22.x).
4. **Vercel, soporte de pnpm**: qué versiones de pnpm acepta hoy la plataforma (¿10.x? ¿12.x?) y si hace falta `ENABLE_EXPERIMENTAL_COREPACK=1` para respetar `packageManager`.
5. **Vercel, variables de entorno**: `DEEPL_API_KEY`, `GOOGLE_PLACES_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SECRET_KEY`, `NUXT_PUBLIC_GA4_ID` en Preview y Production (ya hubo un incidente con `DEEPL_API_KEY`).
6. **Vercel Analytics**: que los page views registren la ruta correcta con vue-router 5 (navegación del lado del cliente).
7. **Comando de generación de tipos**: el comando exacto de `supabase gen types` que usas y si copias a mano el resultado a las 3 rutas.
8. **Ruta `supabase.types` de web** (`./types/database.types.ts`): tras `nuxt prepare`, revisa en `apps/web/.nuxt/types/supabase-database.d.ts` (o similar) si apunta a tu archivo o si el cliente queda sin tipar.
9. **Auto-import de la copia de `layers/core`**: revisa en `.nuxt/types/imports.d.ts` de cada app si aparecen `Database`, `Tables` o `Json` como auto-imports.
10. **Traducciones de `layers/ui`**: si `t('close')`, `t('selected')` y `t('clear')` vienen de `useI18n({ messages })` local o de los JSON de las apps.
11. **Esquemas de la plantilla de admin** (`customers/AddModal.vue`, `settings/*.vue`): ¿se usan, o son restos de la plantilla que se pueden borrar?
12. **Renovate**: ¿está activo en el repo? `apps/admin/renovate.json` viene de la plantilla y asume pnpm.
13. **Windows**: si tienes permisos de administrador para `corepack enable` (o prefieres `npm i -g pnpm@10`), si `git config core.longpaths` está en `true`, y si el repo y `%LOCALAPPDATA%` están en el mismo disco.
14. **`ssr: false` en web**: no es parte de esta reestructuración, pero contradice el objetivo "público, SEO". Conviene decidir cuándo se ataca (requiere resolver el conflicto de `h3` de `.ai/project/architecture.md`).
15. **Bitbucket**: confirma que ya no usas Bitbucket Pipelines (el repo dice que no) y que no queda configuración de schedules ni variables en Bitbucket que haga falta migrar.
