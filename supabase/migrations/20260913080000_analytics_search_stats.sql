-- =============================================================================
-- analytics_search_stats: conteo exacto de búsquedas totales vs. sin resultados
--
-- Necesario para el gauge de "tasa de búsquedas exitosas" del dashboard Home:
-- analytics_top_search_terms(p_zero_results) solo trae el top-10 de términos
-- sin resultados, insuficiente para calcular una tasa real (subestimaría el
-- numerador). Esta función agrega sobre toda la tabla, sin LIMIT.
-- =============================================================================

CREATE OR REPLACE FUNCTION analytics_search_stats(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (total_searches bigint, zero_result_searches bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    count(*) AS total_searches,
    count(*) FILTER (WHERE (payload ->> 'results_count') = '0') AS zero_result_searches
  FROM activity_events
  WHERE event_type = 'search'
    AND created_at >= p_from AND created_at < p_to;
$$;

REVOKE ALL ON FUNCTION analytics_search_stats(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION analytics_search_stats(timestamptz, timestamptz) TO service_role;
