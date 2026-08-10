# CI/CD troubleshooting log

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
pushing — a YAML change alone is never sufic ient.

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
suites green.

**Prevention:** checklist items 1 and 2 above. In general: assume Vercel's
monorepo build for each app only ever sees that app's own `package.json` —
if a shared layer needs a package, every app that uses that layer needs to
declare it too, and every app needs its own correct `engines.node`.

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
