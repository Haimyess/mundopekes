# MundoPekes — Architecture Reference

Source of truth for automated agents (qa-e2e, security, etc.) about what this
app is and which flows matter. Keep this updated as the product changes.

## What this is

MundoPekes: a directory of free/low-cost family activities for parents of
young kids in Israel (parks, museums, playgrounds, events). Two apps in this
monorepo:

- `apps/web` — public-facing site, Nuxt 4, **SSR disabled (`ssr: false`,
  pure SPA)**. Runs client-side only.
- `apps/admin` — internal dashboard for the MundoPekes team (approve
  suggestions, manage places/activities/categories/providers).

Shared code lives in `layers/core`, `layers/domain`, `layers/ui` (Nuxt
layers). Backend is Supabase (Postgres + RLS + Auth + Storage).

## Critical user flows (web)

1. Land on homepage → browse activities by category/filters
2. View activity detail page (hours, location, price, age range)
3. View place detail page
4. Search activities (text + filters: city, category, age, free/paid)
5. Submit contact form
6. Provider registration flow (business submits a place/activity suggestion)
7. Language switch (ES/EN)
8. Mobile navigation (primary nav, filters drawer)

## Critical user flows (admin)

1. Login (Supabase Auth)
2. Review suggestion → approve / reject
3. Edit place (incl. toggle active/inactive status)
4. Edit activity (incl. age ranges, seasons, toggle active/pending)
5. Manage categories
6. View contact requests / feedback analytics
7. Manage providers

## Key integrations

- **Supabase**: Postgres, RLS, Auth, Storage (photos)
- **Google Places API**: search/details/photos, proxied server-side
  (`layers/domain/server/api/places/*`) with rate limiting
  (`layers/domain/server/utils/rate-limit.ts`)
- **DeepL**: auto-translation of i18n fields (admin)
- **Resend**: transactional email (contact form, provider approval/rejection)
- **Sentry**: error tracking — **configured in `apps/web` only**, not in
  `apps/admin`
- **Anthropic Claude (Haiku)**: `scripts/catalog-agent` weekly place
  -discovery agent (separate from the app runtime)

## Known architecture caveats

- `apps/web` runs `ssr: false` — no server-rendered HTML, no SEO benefit,
  slower first paint. Was likely a workaround for an `h3` version conflict
  between the monorepo root and Nitro's internal `h3` breaking the
  `@nuxtjs/supabase` SSR plugin (see session notes 2026-08-07). Root cause
  not yet fixed.
- No `sitemap.xml` / `robots.txt` generation configured.
- No health-check endpoint (`/api/health` or similar) on either app.
- No E2E test suite (Playwright/Cypress) exists yet — only unit tests
  (`vitest`) per app.
