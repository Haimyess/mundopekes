-- =============================================================================
-- Place / Experience separation for `suggestions` + duplicate detection
--
-- Contexto: `places` y `activities` ya están correctamente normalizadas
-- (activities.place_id es el único puntero de ubicación). El gap está en
-- `suggestions`, que hoy siempre mezcla datos de lugar + actividad en una fila
-- y no tiene forma de referenciar un lugar ya existente. Esta migración:
--
--   1. Agrega un discriminador `suggestion_type` a `suggestions` + `place_id`
--      (nullable, seteado solo cuando el usuario elige un lugar existente).
--   2. Agrega columnas de detección de duplicados (flag + punteros).
--   3. Agrega `google_place_id` real e indexado a `places` (hoy solo vive,
--      sin índice, dentro de `metadata` JSONB) + `name_normalized` para
--      matching difuso.
--   4. Aplica, en la misma ventana, la migración RLS que ya estaba escrita
--      pero nunca ejecutada (ver 20260619000000_security_rls_and_rate_limits.sql
--      — decisión confirmada con el owner del producto: aplicar RLS y este
--      esquema juntos en vez de en dos ventanas separadas).
--
-- IMPORTANTE antes de aplicar en producción:
--   - Correr el pre-check de duplicados de google_place_id (sección 3) y
--     resolver manualmente cualquier conflicto antes de crear el índice único.
--   - Confirmar el rol JWT admin (auth.jwt() -> 'app_metadata' ->> 'role')
--     funciona como se espera contra un usuario admin real en staging.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0) Extensiones necesarias para normalización/matching de nombres
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- -----------------------------------------------------------------------------
-- 1) suggestions: discriminador + place_id + campos de duplicado
-- -----------------------------------------------------------------------------

ALTER TABLE suggestions
  ADD COLUMN IF NOT EXISTS suggestion_type text NOT NULL DEFAULT 'new_place_with_experience';

ALTER TABLE suggestions
  DROP CONSTRAINT IF EXISTS suggestions_suggestion_type_chk;
ALTER TABLE suggestions
  ADD CONSTRAINT suggestions_suggestion_type_chk
  CHECK (suggestion_type IN ('new_place_with_experience', 'experience_for_existing_place'));

ALTER TABLE suggestions
  ADD COLUMN IF NOT EXISTS place_id uuid NULL REFERENCES places(id) ON DELETE SET NULL;

-- `location` era NOT NULL — debe relajarse porque una sugerencia de tipo
-- experience_for_existing_place no manda datos de lugar en absoluto.
ALTER TABLE suggestions ALTER COLUMN location DROP NOT NULL;

ALTER TABLE suggestions
  DROP CONSTRAINT IF EXISTS suggestions_type_consistency_chk;
ALTER TABLE suggestions
  ADD CONSTRAINT suggestions_type_consistency_chk CHECK (
    (suggestion_type = 'new_place_with_experience' AND place_id IS NULL)
    OR (suggestion_type = 'experience_for_existing_place' AND place_id IS NOT NULL)
  );

ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS flagged_possible_duplicate boolean NOT NULL DEFAULT false;
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS possible_duplicate_of uuid NULL REFERENCES places(id) ON DELETE SET NULL;
ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS possible_duplicate_activity_id uuid NULL REFERENCES activities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS suggestions_place_id_idx ON suggestions(place_id);
CREATE INDEX IF NOT EXISTS suggestions_type_status_idx ON suggestions(suggestion_type, status);

-- Todas las filas existentes ya cumplen el default (new_place_with_experience,
-- place_id NULL) — no hace falta backfill, el CHECK pasa automáticamente.


-- -----------------------------------------------------------------------------
-- 2) places: google_place_id real + name_normalized para dedup
-- -----------------------------------------------------------------------------

ALTER TABLE places ADD COLUMN IF NOT EXISTS google_place_id text NULL;

UPDATE places
  SET google_place_id = metadata->>'google_place_id'
  WHERE google_place_id IS NULL
    AND metadata ? 'google_place_id'
    AND metadata->>'google_place_id' <> '';

ALTER TABLE places ADD COLUMN IF NOT EXISTS name_normalized text NULL;

UPDATE places
  SET name_normalized = lower(unaccent(trim(get_i18n_text(name_i18n, 'es'))))
  WHERE name_normalized IS NULL;

CREATE INDEX IF NOT EXISTS places_name_normalized_idx ON places(name_normalized);
CREATE INDEX IF NOT EXISTS places_name_trgm_idx ON places USING gin (name_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS places_lat_idx ON places(lat);
CREATE INDEX IF NOT EXISTS places_lng_idx ON places(lng);


-- -----------------------------------------------------------------------------
-- 3) PRE-CHECK manual antes de crear el índice único de google_place_id
-- -----------------------------------------------------------------------------
-- Correr esta consulta ANTES de continuar. Si devuelve filas, hay lugares
-- duplicados con el mismo google_place_id que nunca fue forzado a ser único
-- — resolverlos a mano (merge/borrado) antes de seguir, o el CREATE UNIQUE
-- INDEX de abajo fallará.
--
--   SELECT google_place_id, array_agg(id) FROM places
--     WHERE google_place_id IS NOT NULL
--     GROUP BY google_place_id HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS places_google_place_id_uidx
  ON places(google_place_id) WHERE google_place_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 4) RLS pendiente (20260619000000_security_rls_and_rate_limits.sql)
--    Aplicada en esta misma ventana — decisión confirmada con el owner del
--    producto para no abrir dos ventanas de cambios disruptivos en vez de una.
-- -----------------------------------------------------------------------------

-- A) Rate limiting para el proxy de Google Places
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         text        NOT NULL,
  endpoint   text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_rate_limits_lookup_idx
  ON api_rate_limits (ip, endpoint, created_at);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
-- (sin políticas = deny-all para cualquier rol que no sea service_role)

-- B) RLS para suggestions
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suggestions: insert público" ON suggestions;
CREATE POLICY "suggestions: insert público"
  ON suggestions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "suggestions: select admin" ON suggestions;
CREATE POLICY "suggestions: select admin"
  ON suggestions FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "suggestions: update admin" ON suggestions;
CREATE POLICY "suggestions: update admin"
  ON suggestions FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "suggestions: delete admin" ON suggestions;
CREATE POLICY "suggestions: delete admin"
  ON suggestions FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- C) RLS para places
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "places: select público activos" ON places;
CREATE POLICY "places: select público activos"
  ON places FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "places: select admin todos" ON places;
CREATE POLICY "places: select admin todos"
  ON places FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "places: insert admin" ON places;
CREATE POLICY "places: insert admin"
  ON places FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "places: update admin" ON places;
CREATE POLICY "places: update admin"
  ON places FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "places: delete admin" ON places;
CREATE POLICY "places: delete admin"
  ON places FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- D) RLS para activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities: select público aprobadas" ON activities;
CREATE POLICY "activities: select público aprobadas"
  ON activities FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS "activities: select admin todas" ON activities;
CREATE POLICY "activities: select admin todas"
  ON activities FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "activities: insert admin" ON activities;
CREATE POLICY "activities: insert admin"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "activities: update admin" ON activities;
CREATE POLICY "activities: update admin"
  ON activities FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "activities: delete admin" ON activities;
CREATE POLICY "activities: delete admin"
  ON activities FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- E) RLS para contact_requests
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_requests: insert público" ON contact_requests;
CREATE POLICY "contact_requests: insert público"
  ON contact_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "contact_requests: select admin" ON contact_requests;
CREATE POLICY "contact_requests: select admin"
  ON contact_requests FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "contact_requests: update admin" ON contact_requests;
CREATE POLICY "contact_requests: update admin"
  ON contact_requests FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- F) RLS para categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories: select público" ON categories;
CREATE POLICY "categories: select público"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "categories: insert admin" ON categories;
CREATE POLICY "categories: insert admin"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "categories: update admin" ON categories;
CREATE POLICY "categories: update admin"
  ON categories FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "categories: delete admin" ON categories;
CREATE POLICY "categories: delete admin"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- G) RLS para faq_categories
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_categories: select público" ON faq_categories;
CREATE POLICY "faq_categories: select público"
  ON faq_categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "faq_categories: insert admin" ON faq_categories;
CREATE POLICY "faq_categories: insert admin"
  ON faq_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "faq_categories: update admin" ON faq_categories;
CREATE POLICY "faq_categories: update admin"
  ON faq_categories FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "faq_categories: delete admin" ON faq_categories;
CREATE POLICY "faq_categories: delete admin"
  ON faq_categories FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- H) RLS para faqs
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faqs: select público publicadas" ON faqs;
CREATE POLICY "faqs: select público publicadas"
  ON faqs FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "faqs: select admin todas" ON faqs;
CREATE POLICY "faqs: select admin todas"
  ON faqs FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "faqs: insert admin" ON faqs;
CREATE POLICY "faqs: insert admin"
  ON faqs FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "faqs: update admin" ON faqs;
CREATE POLICY "faqs: update admin"
  ON faqs FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

DROP POLICY IF EXISTS "faqs: delete admin" ON faqs;
CREATE POLICY "faqs: delete admin"
  ON faqs FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
