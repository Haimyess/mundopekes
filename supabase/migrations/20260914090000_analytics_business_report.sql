-- =============================================================================
-- Reporte por negocio (lugar o proveedor) — para presentarle números reales a
-- un proveedor puntual ("tu página tuvo X vistas, Y clicks en cómo llegar en
-- los últimos 30 días") y vender el plan pago.
--
-- Las búsquedas no llevan place_id/activity_id en el payload (una búsqueda
-- devuelve muchos resultados, no uno solo) — por eso no hay forma de
-- atribuir "esta búsqueda encontró tu negocio" 1 a 1. En cambio:
--   a) analytics_market_context da la demanda de mercado (búsquedas en la
--      misma categoría/ciudad del negocio) como contexto, no como atribución.
--   b) searching_sessions en analytics_business_report cuenta sesiones que
--      buscaron Y DESPUÉS vieron este negocio (correlación real vía
--      session_id, sin inventar nada).
-- =============================================================================

CREATE OR REPLACE FUNCTION analytics_business_report(
  p_place_ids text[], p_activity_ids text[], p_from timestamptz, p_to timestamptz
)
RETURNS TABLE (
  views bigint,
  directions bigint,
  contacts bigint,
  unique_sessions bigint,
  searching_sessions bigint
)
LANGUAGE sql STABLE AS $$
  WITH relevant AS (
    SELECT event_type, session_id
    FROM activity_events
    WHERE created_at >= p_from AND created_at < p_to
      AND (
        (event_type = 'place_view' AND (payload ->> 'place_id') = ANY(p_place_ids))
        OR (event_type = 'activity_view' AND (payload ->> 'activity_id') = ANY(p_activity_ids))
        OR (
          event_type = 'directions_click' AND (
            (payload ->> 'target_type' = 'place' AND (payload ->> 'target_id') = ANY(p_place_ids))
            OR
            (payload ->> 'target_type' = 'activity' AND (payload ->> 'target_id') = ANY(p_activity_ids))
          )
        )
        OR (event_type = 'contact_send' AND (payload ->> 'activity_id') = ANY(p_activity_ids))
      )
  ),
  search_sessions AS (
    SELECT DISTINCT session_id
    FROM activity_events
    WHERE event_type = 'search'
      AND created_at >= p_from AND created_at < p_to
      AND session_id IS NOT NULL
  )
  SELECT
    count(*) FILTER (WHERE event_type IN ('place_view', 'activity_view')) AS views,
    count(*) FILTER (WHERE event_type = 'directions_click') AS directions,
    count(*) FILTER (WHERE event_type = 'contact_send') AS contacts,
    count(DISTINCT session_id) AS unique_sessions,
    count(DISTINCT session_id) FILTER (
      WHERE session_id IN (SELECT session_id FROM search_sessions)
    ) AS searching_sessions
  FROM relevant;
$$;

REVOKE ALL ON FUNCTION analytics_business_report(text[], text[], timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION analytics_business_report(text[], text[], timestamptz, timestamptz) TO service_role;


CREATE OR REPLACE FUNCTION analytics_business_timeseries(
  p_place_ids text[], p_activity_ids text[], p_from timestamptz, p_to timestamptz
)
RETURNS TABLE (day date, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT d::date AS day, count(ae.id)
  FROM generate_series(date_trunc('day', p_from), date_trunc('day', p_to), interval '1 day') AS d
  LEFT JOIN activity_events ae
    ON date_trunc('day', ae.created_at) = d
    AND ae.created_at >= p_from AND ae.created_at < p_to
    AND (
      (ae.event_type = 'place_view' AND (ae.payload ->> 'place_id') = ANY(p_place_ids))
      OR (ae.event_type = 'activity_view' AND (ae.payload ->> 'activity_id') = ANY(p_activity_ids))
    )
  GROUP BY d
  ORDER BY d;
$$;

REVOKE ALL ON FUNCTION analytics_business_timeseries(text[], text[], timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION analytics_business_timeseries(text[], text[], timestamptz, timestamptz) TO service_role;


CREATE OR REPLACE FUNCTION analytics_market_context(
  p_category_slugs text[], p_city text, p_from timestamptz, p_to timestamptz
)
RETURNS TABLE (category_searches bigint, city_searches bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    (
      SELECT count(*)
      FROM activity_events ae
      WHERE ae.event_type = 'search'
        AND ae.created_at >= p_from AND ae.created_at < p_to
        AND (ae.payload ->> 'category') = ANY(p_category_slugs)
    ) AS category_searches,
    (
      SELECT count(*)
      FROM activity_events ae
      CROSS JOIN LATERAL unnest(string_to_array(ae.payload ->> 'city', ',')) AS city
      WHERE ae.event_type = 'search'
        AND ae.created_at >= p_from AND ae.created_at < p_to
        AND trim(city) = p_city
    ) AS city_searches;
$$;

REVOKE ALL ON FUNCTION analytics_market_context(text[], text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION analytics_market_context(text[], text, timestamptz, timestamptz) TO service_role;
