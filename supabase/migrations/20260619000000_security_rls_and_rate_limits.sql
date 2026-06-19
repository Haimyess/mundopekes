-- =============================================================================
-- Defensa en profundidad: RLS + rate limiting
--
-- La autorización real ya vive en el server util requireAdminUser()
-- (apps/admin/server/utils/auth.ts). Este archivo es el segundo cinturón de
-- seguridad a nivel DB: si alguien bypasea el server, Supabase lo bloquea aquí.
--
-- NO ejecutar con `supabase db push` hasta revisión manual.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- A) Tabla de rate limiting para el proxy de Google Places
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         text        NOT NULL,
  endpoint   text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_rate_limits_lookup_idx
  ON api_rate_limits (ip, endpoint, created_at);

-- Sin acceso público: solo service_role puede leer/escribir
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- (sin políticas = deny-all para cualquier rol que no sea service_role)


-- -----------------------------------------------------------------------------
-- B) RLS para suggestions
-- -----------------------------------------------------------------------------

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede crear sugerencias (wizard público)
CREATE POLICY "suggestions: insert público"
  ON suggestions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Solo admin puede leer, editar o borrar
CREATE POLICY "suggestions: select admin"
  ON suggestions FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "suggestions: update admin"
  ON suggestions FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "suggestions: delete admin"
  ON suggestions FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');


-- -----------------------------------------------------------------------------
-- C) RLS para places
-- -----------------------------------------------------------------------------

ALTER TABLE places ENABLE ROW LEVEL SECURITY;

-- Lectura pública solo de lugares activos
CREATE POLICY "places: select público activos"
  ON places FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Admin puede leer todos (incluyendo borradores/inactivos)
CREATE POLICY "places: select admin todos"
  ON places FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "places: insert admin"
  ON places FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "places: update admin"
  ON places FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "places: delete admin"
  ON places FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');


-- -----------------------------------------------------------------------------
-- D) RLS para activities
-- -----------------------------------------------------------------------------

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Lectura pública solo de actividades aprobadas
CREATE POLICY "activities: select público aprobadas"
  ON activities FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Admin puede leer todas
CREATE POLICY "activities: select admin todas"
  ON activities FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "activities: insert admin"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "activities: update admin"
  ON activities FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "activities: delete admin"
  ON activities FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');


-- -----------------------------------------------------------------------------
-- E) RLS para contact_requests
-- -----------------------------------------------------------------------------

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede enviar un contacto
CREATE POLICY "contact_requests: insert público"
  ON contact_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Solo admin puede leer y actualizar
CREATE POLICY "contact_requests: select admin"
  ON contact_requests FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "contact_requests: update admin"
  ON contact_requests FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');


-- -----------------------------------------------------------------------------
-- F) RLS para categories
-- -----------------------------------------------------------------------------

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- SELECT público: es navegación del sitio
CREATE POLICY "categories: select público"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "categories: insert admin"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "categories: update admin"
  ON categories FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "categories: delete admin"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');


-- -----------------------------------------------------------------------------
-- G) RLS para faq_categories
-- -----------------------------------------------------------------------------

ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_categories: select público"
  ON faq_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "faq_categories: insert admin"
  ON faq_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "faq_categories: update admin"
  ON faq_categories FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "faq_categories: delete admin"
  ON faq_categories FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');


-- -----------------------------------------------------------------------------
-- H) RLS para faqs
-- -----------------------------------------------------------------------------

ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- SELECT público solo de FAQs publicadas
CREATE POLICY "faqs: select público publicadas"
  ON faqs FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Admin puede leer todas (incluyendo draft)
CREATE POLICY "faqs: select admin todas"
  ON faqs FOR SELECT
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "faqs: insert admin"
  ON faqs FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "faqs: update admin"
  ON faqs FOR UPDATE
  TO authenticated
  USING  (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "faqs: delete admin"
  ON faqs FOR DELETE
  TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
