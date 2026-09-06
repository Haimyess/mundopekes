-- =============================================================================
-- Reset the 2026-08-29 i18n_status backfill's 'manual' tags
--
-- Context: 20260829054112_i18n_translation_status.sql marked every non-empty
-- locale of pre-existing content as 'manual' ("we don't know if this was
-- hand-written or machine-translated, so protect it defensively"). Combined
-- with translateI18nField's rule that a 'manual' locale is never overwritten
-- by a later edit to another locale, this made the live auto-translate-on-blur
-- feature (added 2026-09-05) effectively inert for almost all pre-existing
-- rows: editing e.g. the Spanish description of an old activity would only
-- fill locales that happened to still be empty, since the others were locked
-- 'manual' by the blanket backfill, not by an actual admin edit.
--
-- Fix: remove exactly the status entries whose value matches the backfill's
-- signature (status='manual' AND the single, identical `now()` timestamp that
-- migration produced — verified against production data: 2026-08-29T05:41:
-- 12.290416+00:00, shared by 400+ locale entries across all three tables).
-- This does NOT touch the actual name_i18n/title_i18n/description_i18n text —
-- only the status tracking — and does NOT touch 'manual' entries with a
-- different timestamp (those came from a real save after the backfill, either
-- a genuine hand-edit or the since-fixed status-mistagging bug, and are left
-- alone rather than guessed at). Once removed, the next edit to any locale in
-- that field is free to propagate to these locales again, exactly as it does
-- for a field with no prior status at all.
-- =============================================================================

DO $$
DECLARE
  backfill_ts CONSTANT text := '2026-08-29T05:41:12.290416+00:00';
BEGIN
  UPDATE activities
  SET i18n_status = i18n_status
    || jsonb_build_object(
         'title',
         COALESCE(
           (SELECT jsonb_object_agg(kv.key, kv.value)
            FROM jsonb_each(i18n_status->'title') AS kv(key, value)
            WHERE NOT (kv.key <> 'sourceLocale'
              AND kv.value->>'status' = 'manual'
              AND kv.value->>'updatedAt' = backfill_ts)),
           '{}'::jsonb
         )
       )
    || jsonb_build_object(
         'description',
         COALESCE(
           (SELECT jsonb_object_agg(kv.key, kv.value)
            FROM jsonb_each(i18n_status->'description') AS kv(key, value)
            WHERE NOT (kv.key <> 'sourceLocale'
              AND kv.value->>'status' = 'manual'
              AND kv.value->>'updatedAt' = backfill_ts)),
           '{}'::jsonb
         )
       )
  WHERE i18n_status ? 'title' OR i18n_status ? 'description';

  UPDATE places
  SET i18n_status = i18n_status
    || jsonb_build_object(
         'name',
         COALESCE(
           (SELECT jsonb_object_agg(kv.key, kv.value)
            FROM jsonb_each(i18n_status->'name') AS kv(key, value)
            WHERE NOT (kv.key <> 'sourceLocale'
              AND kv.value->>'status' = 'manual'
              AND kv.value->>'updatedAt' = backfill_ts)),
           '{}'::jsonb
         )
       )
    || jsonb_build_object(
         'description',
         COALESCE(
           (SELECT jsonb_object_agg(kv.key, kv.value)
            FROM jsonb_each(i18n_status->'description') AS kv(key, value)
            WHERE NOT (kv.key <> 'sourceLocale'
              AND kv.value->>'status' = 'manual'
              AND kv.value->>'updatedAt' = backfill_ts)),
           '{}'::jsonb
         )
       )
  WHERE i18n_status ? 'name' OR i18n_status ? 'description';

  UPDATE suggestions
  SET i18n_status = i18n_status
    || jsonb_build_object(
         'name',
         COALESCE(
           (SELECT jsonb_object_agg(kv.key, kv.value)
            FROM jsonb_each(i18n_status->'name') AS kv(key, value)
            WHERE NOT (kv.key <> 'sourceLocale'
              AND kv.value->>'status' = 'manual'
              AND kv.value->>'updatedAt' = backfill_ts)),
           '{}'::jsonb
         )
       )
    || jsonb_build_object(
         'description',
         COALESCE(
           (SELECT jsonb_object_agg(kv.key, kv.value)
            FROM jsonb_each(i18n_status->'description') AS kv(key, value)
            WHERE NOT (kv.key <> 'sourceLocale'
              AND kv.value->>'status' = 'manual'
              AND kv.value->>'updatedAt' = backfill_ts)),
           '{}'::jsonb
         )
       )
  WHERE i18n_status ? 'name' OR i18n_status ? 'description';
END $$;
