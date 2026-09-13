-- =============================================================================
-- Analytics: lugares vistos + clicks en "cómo llegar"
--
-- Segunda vuelta sobre 20260911120000_activity_events_analytics.sql, a pedido
-- del founder tras ver la página en vivo: faltaba poder mostrar "¿cuántas
-- veces se vio la página de tal lugar?" y "¿cuánta gente apretó cómo
-- llegar?". Ambos son eventos nuevos sobre la misma tabla activity_events
-- (event_type 'place_view' / 'directions_click'), no requieren cambios de
-- columnas — solo índices nuevos y funciones de agregación nuevas/extendidas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Índices para los nuevos event_type
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS activity_events_place_id_idx
  ON activity_events ((payload ->> 'place_id'))
  WHERE event_type = 'place_view';

CREATE INDEX IF NOT EXISTS activity_events_directions_target_idx
  ON activity_events ((payload ->> 'target_type'), (payload ->> 'target_id'))
  WHERE event_type = 'directions_click';

-- -----------------------------------------------------------------------------
-- B) analytics_top_activities: agrega columna "directions"
--
-- Postgres no permite CREATE OR REPLACE cuando cambia el RETURNS TABLE, así
-- que hay que dropear la versión anterior (misma firma de parámetros) antes
-- de recrearla.
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS analytics_top_activities(timestamptz, timestamptz, int);

CREATE FUNCTION analytics_top_activities(
  p_from timestamptz, p_to timestamptz, p_limit int DEFAULT 10
)
RETURNS TABLE (
  activity_id text, title text, views bigint, contacts bigint, directions bigint,
  conversion_rate numeric
)
LANGUAGE sql STABLE AS $$
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
  ),
  directions AS (
    SELECT
      ae.payload ->> 'target_id' AS activity_id,
      count(*) AS directions
    FROM activity_events ae
    WHERE ae.event_type = 'directions_click'
      AND ae.payload ->> 'target_type' = 'activity'
      AND ae.created_at >= p_from AND ae.created_at < p_to
      AND coalesce(ae.payload ->> 'target_id', '') <> ''
    GROUP BY ae.payload ->> 'target_id'
  )
  SELECT
    v.activity_id,
    v.title,
    v.views,
    coalesce(c.contacts, 0) AS contacts,
    coalesce(d.directions, 0) AS directions,
    round(coalesce(c.contacts, 0)::numeric / v.views, 4) AS conversion_rate
  FROM views v
  LEFT JOIN contacts c ON c.activity_id = v.activity_id
  LEFT JOIN directions d ON d.activity_id = v.activity_id
  ORDER BY v.views DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION analytics_top_activities(timestamptz, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION analytics_top_activities(timestamptz, timestamptz, int) TO service_role;

-- -----------------------------------------------------------------------------
-- C) analytics_top_places (nueva): mismo patrón que top_activities, pero sobre
-- place_view + directions_click con target_type='place'. Sin columna de
-- conversión/contacto — no hay un evento de contacto atribuible a nivel lugar.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION analytics_top_places(
  p_from timestamptz, p_to timestamptz, p_limit int DEFAULT 10
)
RETURNS TABLE (place_id text, title text, views bigint, directions bigint)
LANGUAGE sql STABLE AS $$
  WITH views AS (
    SELECT
      ae.payload ->> 'place_id' AS place_id,
      max(ae.payload ->> 'title') AS title,
      count(*) AS views
    FROM activity_events ae
    WHERE ae.event_type = 'place_view'
      AND ae.created_at >= p_from AND ae.created_at < p_to
      AND coalesce(ae.payload ->> 'place_id', '') <> ''
    GROUP BY ae.payload ->> 'place_id'
  ),
  directions AS (
    SELECT
      ae.payload ->> 'target_id' AS place_id,
      count(*) AS directions
    FROM activity_events ae
    WHERE ae.event_type = 'directions_click'
      AND ae.payload ->> 'target_type' = 'place'
      AND ae.created_at >= p_from AND ae.created_at < p_to
      AND coalesce(ae.payload ->> 'target_id', '') <> ''
    GROUP BY ae.payload ->> 'target_id'
  )
  SELECT
    v.place_id,
    v.title,
    v.views,
    coalesce(d.directions, 0) AS directions
  FROM views v
  LEFT JOIN directions d ON d.place_id = v.place_id
  ORDER BY v.views DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION analytics_top_places(timestamptz, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION analytics_top_places(timestamptz, timestamptz, int) TO service_role;
