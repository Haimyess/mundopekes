# CI/CD troubleshooting log

> **Nota (2026-10-20):** el proyecto migró de Bitbucket Pipelines a GitHub
> Actions (`.github/workflows/`) y el deploy lo hace la integración nativa de
> Vercel. El catalog-agent y el agente QA fueron eliminados. Las entradas de
> abajo que mencionan Bitbucket son históricas.

Real failures this pipeline has hit, their root cause, the fix, and — most
important — the checklist item that would have caught it before it burned a
Bitbucket build or a Vercel deploy. Add a new entry every time a pipeline or
deploy fails for a reason that isn't "the code is actually broken." The goal
is to stop paying the same cost (build minutes, deploy time, context-switching)
for the same mistake twice.

**Ground rule: never "fix" a failing pipeline by disabling or skipping the
check that caught it.** A red pipeline is the check working as intended. If a
security/lint/test step is wrong (false positive, quota issue, flaky), say so
explicitly, get a second person's sign-off if it's a security step, and log
it here — don't quietly add `--no-verify`, comment out a step, or lower a
severity threshold to make the color turn green.

## Checklist — before merging a long-lived branch or adding a dependency

Run through this whenever `dev` and `main` have diverged significantly, or
whenever a new package is added that's used by a shared Nuxt layer
(`layers/*`):

- [ ] Every `apps/*/package.json` that uses a layer explicitly declares
      every dependency that layer's `nuxt.config.ts` lists in `modules:` —
      don't rely on it being hoisted from a sibling workspace or the
      monorepo root. Vercel installs each app in isolation; Bitbucket/local
      installs from the workspace root and hoists, which hides this class of
      bug until it hits Vercel.
- [ ] `engines.node` in **every** `package.json` in the monorepo (root,
      `apps/web`, `apps/admin`) matches `.nvmrc`. Vercel reads `engines.node`
      from whichever `package.json` sits in that Vercel project's configured
      "Root Directory" — not the monorepo root — so the root pinning alone
      does not protect the per-app Vercel builds.
- [ ] If you can, do one throwaway test deploy (or check Vercel's build log
      for the next preview) before merging a big multi-week branch to `main`
      — don't assume "it built locally" transfers to Vercel's isolated,
      per-app install.
- [ ] Custom/scheduled Bitbucket pipelines are configured under `custom:` in
      `bitbucket-pipelines.yml` and the actual cron schedule is set in the
      Bitbucket UI (Repository settings → Pipelines → Schedules), **not**
      as a `schedules:` key in the YAML — that key doesn't exist in
      Bitbucket's pipeline schema and is silently ignored/invalid.
- [ ] Push to `dev` only, and wait for that pipeline to go green, before
      merging and pushing to `main`. Pushing both at once (or merging to
      `main` immediately after pushing `dev`) triggers two full pipelines
      — install/prepare/lint/test/deploy, twice — for the exact same
      commit. `main`'s security step is manual-trigger anyway, so there's
      no verification benefit to running it in parallel with `dev`, only
      doubled build minutes.

---

## 2026-08-08 — `schedules:` is not a valid Bitbucket Pipelines key

**Symptom:** the catalog-agent's weekly pipeline never ran automatically.

**Root cause:** `bitbucket-pipelines.yml` had a top-level `schedules:` block
next to `custom:`, expecting it to define the cron trigger declaratively.
Bitbucket Pipelines has no such key — schedules for `custom:` pipelines are
configured entirely outside the YAML, in the repo's Pipelines settings UI.
The key was silently ignored (no YAML validation error), so nothing ran and
nothing failed loudly either.

**Fix:** moved the pipeline definition to a proper `custom:` entry
(`catalog-agent-weekly`, see the file) and set the weekly schedule manually
in Bitbucket → Repository settings → Pipelines → Schedules → branch `main`
→ pipeline `catalog-agent-weekly`.

**Prevention:** see checklist item 4 above. When adding a scheduled job,
confirm the schedule is visible in the Pipelines → Schedules UI after
pushing — a YAML change alone is never sufficient.

---

## 2026-08-09 — Vercel preview build failed for both apps after merging `dev` → `main`

Bitbucket's own `Install dependencies` / `Prepare Nuxt` / `Lint` / `Test`
steps all passed. The failure was in the two `Deploy *-preview` steps, which
shell out to `vercel build` — a **separate, isolated build environment** on
Vercel's infrastructure, not a continuation of the Bitbucket job.

### apps/admin — `[NUXT_B8017] Cannot resolve module "@nuxt/image"`

**Symptom:** `npm install` succeeded, but the `postinstall` script
(`nuxt prepare`) failed because `layers/core/nuxt.config.ts` declares
`modules: ['@nuxt/image']`, and nothing in `apps/admin`'s own dependency
tree provided it.

**Root cause:** `@nuxt/image` was only listed in the monorepo root
`package.json` and in `apps/web/package.json`. On Bitbucket (and locally),
`npm ci`/`npm install` runs once from the workspace root, so npm hoists
`@nuxt/image` into the root `node_modules`, and `apps/admin` can resolve it
via Node's normal upward module lookup — masking the missing declaration.
Vercel's monorepo support installs **per project**, scoped to that
project's configured Root Directory (`apps/admin`), so nothing hoisted it
and the resolve failed.

**Fix:** added `"@nuxt/image": "^2.0.0"` directly to
`apps/admin/package.json` (matching the version already pinned in
`apps/web` and root), so admin's dependency tree is self-sufficient
regardless of which install strategy runs.

### apps/web — `npm install` itself crashed: `ERR_INVALID_ARG_TYPE: The "from" argument must be of type string. Received undefined`

**Symptom:** the very first `npm install --legacy-peer-deps` on Vercel
failed before touching any project code — an npm-internal error, not a
dependency-resolution or code error.

**Root cause:** `apps/web/package.json` had no `engines.node` field at all
(unlike the root `package.json`, which pins `"node": "22.x"`, matching
`.nvmrc`). With nothing to constrain it, Vercel used its own default/latest
Node runtime (v24.15.0) for that project's build — a version this lockfile
was never installed against — and hit a known class of npm bug that
surfaces under Node/npm version combinations the lockfile wasn't generated
with.

**Fix:** added `"engines": { "node": "22.x" }` to `apps/web/package.json`
directly (and normalized `apps/admin/package.json`'s existing loose
`>=20.0.0` to the same strict `22.x`), so every workspace's Vercel-configured
Root Directory carries an explicit, correct Node pin — not just the
monorepo root, which Vercel's per-app builds never actually read.

**Verified before committing:** clean `nuxt prepare` in both apps, full-repo
lint (0 errors, same pre-existing warning count as before), and both test
suites green — locally, not against Vercel's actual infrastructure (no
Vercel access from this environment).

**Prevention:** checklist items 1 and 2 above. In general: assume Vercel's
monorepo build for each app only ever sees that app's own `package.json` —
if a shared layer needs a package, every app that uses that layer needs to
declare it too, and every app needs its own correct `engines.node`.

**Follow-up, 2026-08-10 — the `engines.node` fix alone did NOT fix `apps/web`.**
Admin's deploy went green (the `@nuxt/image` fix was the real fix there).
Web failed again with the _exact same_ `ERR_INVALID_ARG_TYPE` crash, on a
build that logged `Restored build cache from previous deployment
(3DfvetqCuisbfGFKc7jmyikAxDFT)` — **the identical cache ID as the original
failure**, across two commits that both changed `package.json`/
`package-lock.json`. First guess was a stale/corrupted Vercel-side cache —
**wrong, or at least not the fix**: redeploying from the dashboard with
"Use existing Build Cache" unchecked still logged the same restored-cache
line and hit the identical error. Whatever that toggle controls, it isn't
whatever's actually causing this.

**Actual root cause:** `ERR_INVALID_ARG_TYPE: The "from" argument must be
of type string` is a known npm bug class tied to `npm install`'s
dependency-resolution/diffing algorithm, not `npm ci`'s more literal
install-from-lockfile path. The monorepo root `vercel.json` had
`"installCommand": "npm install --legacy-peer-deps"` — meanwhile
`bitbucket-pipelines.yml`'s install step already used
`npm ci --legacy-peer-deps` against the exact same lockfile and had never
once failed this way. That's the tell: same lockfile, different install
command, only the `npm install` path breaks.

**Fix:** changed `vercel.json`'s `installCommand` to
`npm ci --legacy-peer-deps`, matching Bitbucket's already-proven-working
command. `npm ci` is also the generally-recommended command for CI/deploy
installs regardless (deterministic, fails loudly on a lockfile/package.json
mismatch instead of silently reconciling one) — verified locally with a
full `npm ci --legacy-peer-deps` from a clean install, then `nuxt prepare`
in both apps, full lint, and both test suites, all green.

**Prevention:** if a from-scratch install passes with `npm ci` locally and
in Bitbucket but a deploy target still fails with an npm-internal crash
(not a your-code error), check whether that target is invoking a
_different_ install command than the one already proven to work elsewhere
in the pipeline — don't assume all "npm install"-shaped commands are
equivalent.

---

## 2026-08-09 — local `git push` blocked by the pre-push hook's Snyk check (quota exhausted)

**Symptom:** `git push` failed locally with `husky - pre-push script
failed`, root cause `snyk test` reporting "You have reached your monthly
limit of 200 private tests."

**Root cause:** this is an account/plan quota limit on Snyk's side, not a
newly introduced vulnerability — the one flagged issue
(`brace-expansion@5.0.8`, high severity, no fix available yet) is
pre-existing and unrelated to the change being pushed.

**What was done:** pushed with `--no-verify`, **only after explicit
sign-off**, and only because the flagged issue was independently confirmed
pre-existing/unfixable, not because the check was inconvenient. This is the
one acceptable case for bypassing a security hook — verify first, get
sign-off, then bypass, and log it here. It is not a green light to make
`--no-verify` a habit.

**Not yet resolved:** Bitbucket's own pipeline (`main`'s Security scan step)
is `trigger: manual` and separate from this local hook, so it wasn't
blocked by the same quota — but the same quota exhaustion will hit it too if
triggered before the monthly limit resets. Worth checking the Snyk plan/
usage before manually triggering that step, or budgeting Snyk's test calls
(e.g. `--all-projects` in one call instead of the three separate
per-manifest calls the local hook currently runs) so the same push doesn't
burn 3 tests instead of 1.

---

## 2026-09-07 — Admin i18n auto-translate silently does nothing on Vercel, works (partially) locally

**Symptom:** editing título/descripción in an activity's edit drawer: on the
Vercel deploy, nothing happens at all — no translation, no error toast, only
a failed-request error visible in the browser console. Locally, translation
runs but sometimes only reaches one of the three target locales instead of
all three.

**Root cause (Vercel): `DEEPL_API_KEY` is only a Bitbucket-side value —
never configured as a Vercel Environment Variable for the admin project.**
`deploy-admin-prod`/`deploy-admin-preview` shell out to
`npx vercel --token=$VERCEL_TOKEN [--prod] --yes` with no `vercel build`/
`vercel env pull` step, so Vercel does a **remote** build using whatever
Environment Variables are configured in the Vercel dashboard for that
project — `$VERCEL_TOKEN`/`$VERCEL_ORG_ID`/`$VERCEL_PROJECT_ID_ADMIN` (the
Bitbucket repo variables) only authenticate _triggering_ the deploy, they
never inject `DEEPL_API_KEY` into it. `apps/admin/nuxt.config.ts` reads
`deeplApiKey: process.env.DEEPL_API_KEY ?? ''`, so on Vercel this resolves
to `''` (falsy): `/api/i18n/translate-field` (live translate-on-blur) 400s
with "DeepL no está configurado", and the PUT/POST save endpoints' `if
(config.deeplApiKey && ...)` guard skips translation entirely — both fail
silently by design (`I18nTabs.vue`'s blur handler swallows the fetch error
so a transient network hiccup doesn't wipe out what was typed), which is
exactly why nothing visible happens on save either.

**Fix:** add `DEEPL_API_KEY` (and double-check `GOOGLE_PLACES_API_KEY`,
same pattern) to the Vercel dashboard → admin project → Settings →
Environment Variables, for both Preview and Production, then redeploy.

**Root cause (local, separate issue): stale `manual` locks from a bug that
shipped with the live-translate-on-blur feature, fixed in commit `7f4eab1`.**
Before that fix, the save endpoints recomputed `i18n_status` by diffing the
incoming payload against the DB — but the live-blur call had already
rewritten _other_ locales client-side before Guardar was even clicked, so
the diff saw every blur-touched locale as "changed" and mis-tagged it
`manual`, permanently protecting it from future auto-translation (by
design, a `manual` locale is never overwritten by another locale's edit).
Confirmed via direct simulation against `translateI18nField` that the
current code correctly cascades to all locales once those false locks are
gone. Two activities (Haim's own QA test rows) had this signature in
production and were cleaned up in
`supabase/migrations/20260907040000_clear_stale_manual_locks_test_activities.sql`.

**Not yet resolved:** there is no UI indicator distinguishing a
legitimately protected (`manual`) locale from one that just hasn't been
translated yet, and blur/save failures never surface a toast — so a real
misconfiguration (like the missing Vercel env var above) looks identical to
"nothing happened." Worth adding both once this settles.
