-- =============================================================================
-- Analytics de activity_events: tablas versionadas + funciones de agregación SQL
--
-- activity_events y app_logs existían en la base desde antes pero nunca en una
-- migración versionada (se crearon fuera del repo, probablemente desde el
-- dashboard de Supabase). Este archivo las documenta retroactivamente con
-- guards idempotentes (CREATE TABLE IF NOT EXISTS — si ya existen, es un
-- no-op), agrega los índices que necesitan las consultas de abajo, y agrega
-- funciones de agregación en SQL real (GROUP BY) para la página interna de
-- analytics (apps/admin/app/pages/user-events.vue), reemplazando el plegado
-- en JS con topes de fila arbitrarios (.limit(500)/.limit(2000)) que tenía
-- apps/admin/server/api/user-events/summary.get.ts hasta ahora.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- A) Tablas (documentación retroactiva)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS activity_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text        NOT NULL,
  session_id text,
  locale     text,
  payload    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  level      text        NOT NULL,
  context    text        NOT NULL,
  message    text        NOT NULL,
  metadata   jsonb,
  app        text        NOT NULL DEFAULT 'web',
  created_at timestamptz DEFAULT now()
);

-- Sin acceso público: solo service_role puede leer/escribir, mismo patrón que
-- api_rate_limits en 20260619000000_security_rls_and_rate_limits.sql. Los dos
-- consumidores actuales (apps/web/server/api/track.post.ts,
-- apps/admin/server/api/user-events/summary.get.ts) ya usan
-- serverSupabaseServiceRole() — esto documenta en la DB lo que ya es cierto
-- en la práctica, no cambia el control de acceso real.
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
-- (sin políticas = deny-all para cualquier rol que no sea service_role)


-- -----------------------------------------------------------------------------
-- B) Índices para los patrones de consulta de la página de analytics
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS activity_events_created_at_idx
  ON activity_events (created_at);

CREATE INDEX IF NOT EXISTS activity_events_type_created_idx
  ON activity_events (event_type, created_at);

CREATE INDEX IF NOT EXISTS activity_events_category_idx
  ON activity_events ((payload ->> 'category'))
  WHERE event_type IN ('search', 'activity_view');

CREATE INDEX IF NOT EXISTS activity_events_activity_id_idx
  ON activity_events ((payload ->> 'activity_id'))
  WHERE event_type IN ('activity_view', 'contact_send');


-- -----------------------------------------------------------------------------
-- C) Funciones de agregación (SQL real, no plegado en JS) — solo service_role
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION analytics_events_by_type(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (event_type text, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT ae.event_type, count(*)
  FROM activity_events ae
  WHERE ae.created_at >= p_from AND ae.created_at < p_to
  GROUP BY ae.event_type
  ORDER BY count(*) DESC;
$$;

CREATE OR REPLACE FUNCTION analytics_timeseries(
  p_from timestamptz, p_to timestamptz, p_event_type text DEFAULT NULL
)
RETURNS TABLE (day date, count bigint)
LANGUAGE sql STABLE AS $$
  -- generate_series ya viene con los días sin actividad rellenados en cero,
  -- para que el gráfico de tendencia no tenga huecos.
  SELECT d::date AS day, count(ae.id)
  FROM generate_series(date_trunc('day', p_from), date_trunc('day', p_to), interval '1 day') AS d
  LEFT JOIN activity_events ae
    ON date_trunc('day', ae.created_at) = d
    AND ae.created_at >= p_from AND ae.created_at < p_to
    AND (p_event_type IS NULL OR ae.event_type = p_event_type)
  GROUP BY d
  ORDER BY d;
$$;

CREATE OR REPLACE FUNCTION analytics_top_search_terms(
  p_from timestamptz, p_to timestamptz, p_limit int DEFAULT 10, p_zero_results boolean DEFAULT false
)
RETURNS TABLE (term text, count bigint)
LANGUAGE sql STABLE AS $$
  -- Con p_zero_results = true, filtra a búsquedas que no devolvieron ningún
  -- resultado: es la lista de demanda que hoy la plataforma no captura.
  SELECT ae.payload ->> 'query' AS term, count(*)
  FROM activity_events ae
  WHERE ae.event_type = 'search'
    AND ae.created_at >= p_from AND ae.created_at < p_to
    AND coalesce(ae.payload ->> 'query', '') <> ''
    AND (NOT p_zero_results OR (ae.payload ->> 'results_count') = '0')
  GROUP BY ae.payload ->> 'query'
  ORDER BY count(*) DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION analytics_top_categories(
  p_from timestamptz, p_to timestamptz, p_limit int DEFAULT 10
)
RETURNS TABLE (category_slug text, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT ae.payload ->> 'category' AS category_slug, count(*)
  FROM activity_events ae
  WHERE ae.event_type = 'search'
    AND ae.created_at >= p_from AND ae.created_at < p_to
    AND coalesce(ae.payload ->> 'category', '') <> ''
  GROUP BY ae.payload ->> 'category'
  ORDER BY count(*) DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION analytics_top_cities(
  p_from timestamptz, p_to timestamptz, p_limit int DEFAULT 10
)
RETURNS TABLE (city_name text, count bigint)
LANGUAGE sql STABLE AS $$
  -- payload->>'city' puede traer varias ciudades separadas por coma (selector
  -- multi-ciudad en el buscador) — se separan antes de contar cada una.
  SELECT trim(city) AS city_name, count(*)
  FROM activity_events ae
  CROSS JOIN LATERAL unnest(string_to_array(ae.payload ->> 'city', ',')) AS city
  WHERE ae.event_type = 'search'
    AND ae.created_at >= p_from AND ae.created_at < p_to
    AND coalesce(ae.payload ->> 'city', '') <> ''
    AND trim(city) <> ''
  GROUP BY trim(city)
  ORDER BY count(*) DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION analytics_top_age_ranges(
  p_from timestamptz, p_to timestamptz, p_limit int DEFAULT 10
)
RETURNS TABLE (age_range_id text, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT ae.payload ->> 'age_range' AS age_range_id, count(*)
  FROM activity_events ae
  WHERE ae.event_type = 'search'
    AND ae.created_at >= p_from AND ae.created_at < p_to
    AND coalesce(ae.payload ->> 'age_range', '') <> ''
  GROUP BY ae.payload ->> 'age_range'
  ORDER BY count(*) DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION analytics_top_activities(
  p_from timestamptz, p_to timestamptz, p_limit int DEFAULT 10
)
RETURNS TABLE (
  activity_id text, title text, views bigint, contacts bigint, conversion_rate numeric
)
LANGUAGE sql STABLE AS $$
  -- Conversión vista → contacto por actividad: hoy no hay proveedores reales
  -- pagando, así que esta es la métrica de "qué contenido genera interés
  -- real" armada con los eventos que ya existen (activity_view + contact_send
  -- cruzados por activity_id), no una métrica atribuida a un proveedor.
  WITH views AS (
    SELECT
      ae.payload ->> 'activity_id' AS activity_id,
      max(ae.payload ->> 'title') AS title,
      count(*) AS views
    FROM activity_events ae
    WHERE ae.event_type = 'activity_view'
      AND ae.created_at >= p_from AND ae.created_at < p_to
      AND coalesce(ae.payload ->> 'activity_id', '') <> ''
    GROUP BY ae.payload ->> 'activity_id'
  ),
  contacts AS (
    SELECT
      ae.payload ->> 'activity_id' AS activity_id,
      count(*) AS contacts
    FROM activity_events ae
    WHERE ae.event_type = 'contact_send'
      AND ae.created_at >= p_from AND ae.created_at < p_to
      AND coalesce(ae.payload ->> 'activity_id', '') <> ''
    GROUP BY ae.payload ->> 'activity_id'
  )
  SELECT
    v.activity_id,
    v.title,
    v.views,
    coalesce(c.contacts, 0) AS contacts,
    round(coalesce(c.contacts, 0)::numeric / v.views, 4) AS conversion_rate
  FROM views v
  LEFT JOIN contacts c ON c.activity_id = v.activity_id
  ORDER BY v.views DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION analytics_distinct_sessions(p_from timestamptz, p_to timestamptz)
RETURNS bigint
LANGUAGE sql STABLE AS $$
  SELECT count(DISTINCT session_id)
  FROM activity_events
  WHERE created_at >= p_from AND created_at < p_to
    AND session_id IS NOT NULL;
$$;

-- Solo service_role puede ejecutar estas funciones — mismas manos que ya leen
-- activity_events hoy vía serverSupabaseServiceRole().
REVOKE ALL ON FUNCTION analytics_events_by_type(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION analytics_timeseries(timestamptz, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION analytics_top_search_terms(timestamptz, timestamptz, int, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION analytics_top_categories(timestamptz, timestamptz, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION analytics_top_cities(timestamptz, timestamptz, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION analytics_top_age_ranges(timestamptz, timestamptz, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION analytics_top_activities(timestamptz, timestamptz, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION analytics_distinct_sessions(timestamptz, timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION analytics_events_by_type(timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION analytics_timeseries(timestamptz, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION analytics_top_search_terms(timestamptz, timestamptz, int, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION analytics_top_categories(timestamptz, timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION analytics_top_cities(timestamptz, timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION analytics_top_age_ranges(timestamptz, timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION analytics_top_activities(timestamptz, timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION analytics_distinct_sessions(timestamptz, timestamptz) TO service_role;
