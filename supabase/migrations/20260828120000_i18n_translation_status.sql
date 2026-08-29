-- =============================================================================
-- Translation status tracking para places / activities / suggestions
--
-- Contexto: `name_i18n`/`title_i18n`/`description_i18n` ya son jsonb desde
-- antes de esta migración — no hace falta reestructurarlos. Lo que falta es
-- saber, por locale, si una traducción es:
--   - 'manual': un admin la escribió/editó a mano (protegida — no se
--     regenera automáticamente cuando otro locale cambia).
--   - 'auto':   la generó el TranslationService (DeepL hoy).
--   - 'error':  el último intento de traducción falló — el texto que ya
--     había queda intacto (nunca se vacía por un fallo).
--
-- Esta columna es puramente aditiva: no toca name_i18n/title_i18n/
-- description_i18n, no rompe ningún read path existente (nada la consulta
-- todavía), y no requiere backfill para funcionar — una fila sin entradas en
-- i18n_status simplemente se trata como "status desconocido" hasta el
-- próximo guardado. El backfill de abajo es una mejora conservadora: marca
-- todo el contenido multilenguaje ya existente como 'manual' (no sabemos si
-- fue escrito a mano o generado antes de que este tracking existiera, y
-- 'manual' es la opción que protege ese contenido de que un futuro guardado
-- en inglés lo pise sin querer).
-- =============================================================================

ALTER TABLE places ADD COLUMN IF NOT EXISTS i18n_status jsonb NOT NULL DEFAULT '{}';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS i18n_status jsonb NOT NULL DEFAULT '{}';
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS i18n_status jsonb NOT NULL DEFAULT '{}';

ALTER TABLE places
  DROP CONSTRAINT IF EXISTS places_i18n_status_is_object_chk;
ALTER TABLE places
  ADD CONSTRAINT places_i18n_status_is_object_chk CHECK (jsonb_typeof(i18n_status) = 'object');

ALTER TABLE activities
  DROP CONSTRAINT IF EXISTS activities_i18n_status_is_object_chk;
ALTER TABLE activities
  ADD CONSTRAINT activities_i18n_status_is_object_chk CHECK (jsonb_typeof(i18n_status) = 'object');

ALTER TABLE suggestions
  DROP CONSTRAINT IF EXISTS suggestions_i18n_status_is_object_chk;
ALTER TABLE suggestions
  ADD CONSTRAINT suggestions_i18n_status_is_object_chk CHECK (jsonb_typeof(i18n_status) = 'object');


-- -----------------------------------------------------------------------------
-- Backfill: marcar como 'manual' cada locale con texto ya presente, para los
-- campos traducibles de cada tabla. sourceLocale se setea a 'en' (política
-- canonical hacia adelante), aunque el contenido histórico haya sido
-- originalmente escrito en otro idioma — no hay forma de reconstruir eso
-- retroactivamente, y no es necesario para que el tracking funcione bien de
-- acá en más.
-- -----------------------------------------------------------------------------

UPDATE places
SET i18n_status = i18n_status
  || jsonb_build_object(
       'name',
       jsonb_build_object('sourceLocale', 'en')
         || COALESCE(
              (SELECT jsonb_object_agg(key, jsonb_build_object('status', 'manual', 'updatedAt', now()))
               FROM jsonb_each_text(name_i18n) AS t(key, value)
               WHERE value IS NOT NULL AND value <> ''),
              '{}'::jsonb
            )
     )
  || jsonb_build_object(
       'description',
       jsonb_build_object('sourceLocale', 'en')
         || COALESCE(
              (SELECT jsonb_object_agg(key, jsonb_build_object('status', 'manual', 'updatedAt', now()))
               FROM jsonb_each_text(description_i18n) AS t(key, value)
               WHERE value IS NOT NULL AND value <> ''),
              '{}'::jsonb
            )
     )
WHERE i18n_status = '{}'::jsonb
  AND (name_i18n IS NOT NULL OR description_i18n IS NOT NULL);

UPDATE activities
SET i18n_status = i18n_status
  || jsonb_build_object(
       'title',
       jsonb_build_object('sourceLocale', 'en')
         || COALESCE(
              (SELECT jsonb_object_agg(key, jsonb_build_object('status', 'manual', 'updatedAt', now()))
               FROM jsonb_each_text(title_i18n) AS t(key, value)
               WHERE value IS NOT NULL AND value <> ''),
              '{}'::jsonb
            )
     )
  || jsonb_build_object(
       'description',
       jsonb_build_object('sourceLocale', 'en')
         || COALESCE(
              (SELECT jsonb_object_agg(key, jsonb_build_object('status', 'manual', 'updatedAt', now()))
               FROM jsonb_each_text(description_i18n) AS t(key, value)
               WHERE value IS NOT NULL AND value <> ''),
              '{}'::jsonb
            )
     )
WHERE i18n_status = '{}'::jsonb
  AND (title_i18n IS NOT NULL OR description_i18n IS NOT NULL);

UPDATE suggestions
SET i18n_status = i18n_status
  || jsonb_build_object(
       'name',
       jsonb_build_object('sourceLocale', 'en')
         || COALESCE(
              (SELECT jsonb_object_agg(key, jsonb_build_object('status', 'manual', 'updatedAt', now()))
               FROM jsonb_each_text(name_i18n) AS t(key, value)
               WHERE value IS NOT NULL AND value <> ''),
              '{}'::jsonb
            )
     )
  || jsonb_build_object(
       'description',
       jsonb_build_object('sourceLocale', 'en')
         || COALESCE(
              (SELECT jsonb_object_agg(key, jsonb_build_object('status', 'manual', 'updatedAt', now()))
               FROM jsonb_each_text(description_i18n) AS t(key, value)
               WHERE value IS NOT NULL AND value <> ''),
              '{}'::jsonb
            )
     )
WHERE i18n_status = '{}'::jsonb
  AND (name_i18n IS NOT NULL OR description_i18n IS NOT NULL);
