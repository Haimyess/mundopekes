-- =============================================================================
-- Clear stale 'manual' i18n_status locks left by the pre-fix live-blur bug
--
-- Context: before 2026-09-06's fix (live i18n translate-on-blur + trusting the
-- client-computed status on save), the admin's PUT endpoints recomputed
-- i18n_status by diffing the incoming payload against the DB. Because the
-- live-blur-on-field-focus-loss feature already rewrote OTHER locales in the
-- client's local copy before Guardar was even clicked, that diff saw every
-- locale the blur had touched as "changed" — not just the one the admin
-- actually typed — and mis-tagged them 'manual', permanently protecting them
-- from future auto-translation (translateI18nField never overwrites a
-- 'manual' locale from another locale's edit).
--
-- Identified via Supabase query (2026-09-07): exactly two activities carry
-- this signature (2+ non-source locales marked 'manual' on the same field),
-- both from Haim's own QA testing on 2026-08-30/09-05 — not real content:
--   - cb0fe1a6-f9f0-43e5-be90-c348f6090aaa ("Parks in Yarkon Park TEST")
--     description: en manual @2026-09-05T10:12:13.926Z,
--                  he manual @2026-08-30T05:27:19.107Z
--   - b50fc65c-eeea-4e91-b050-c166fdacb36f ("Playground")
--     description: es manual @2026-09-05T10:09:18.719Z,
--                  ru manual @2026-09-05T10:09:37.497Z
-- `places` has no rows matching this pattern.
--
-- Fix: remove exactly these locale entries (matched by id + locale + the
-- exact updatedAt recorded above, so this is a no-op if the data has since
-- changed) so the next edit to either activity's description is free to
-- propagate to all locales again, same as a field with no prior status.
-- =============================================================================

UPDATE activities
SET i18n_status = jsonb_set(
  i18n_status,
  '{description}',
  (i18n_status->'description') - 'en' - 'he'
)
WHERE id = 'cb0fe1a6-f9f0-43e5-be90-c348f6090aaa'
  AND i18n_status->'description'->'en'->>'updatedAt' = '2026-09-05T10:12:13.926Z'
  AND i18n_status->'description'->'he'->>'updatedAt' = '2026-08-30T05:27:19.107Z';

UPDATE activities
SET i18n_status = jsonb_set(
  i18n_status,
  '{description}',
  (i18n_status->'description') - 'es' - 'ru'
)
WHERE id = 'b50fc65c-eeea-4e91-b050-c166fdacb36f'
  AND i18n_status->'description'->'es'->>'updatedAt' = '2026-09-05T10:09:18.719Z'
  AND i18n_status->'description'->'ru'->>'updatedAt' = '2026-09-05T10:09:37.497Z';
