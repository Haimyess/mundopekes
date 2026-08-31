/**
 * Clustering de pines en grilla de píxeles — función pura, sin depender
 * de Leaflet (por eso "useMarkerClustering" en vez de un método de
 * L.Marker.Cluster): la proyección Web Mercator se calcula a mano, así
 * se puede testear sin montar un mapa real. Reemplaza el intento anterior
 * con leaflet.markercluster, descartado por depender de window.L y
 * resultar frágil en producción (ver comentario histórico en
 * MapView.vue) — acá no hay import dinámico de ninguna librería de
 * clustering, solo aritmética + los <LMarker> declarativos que ya
 * funcionan.
 *
 * Algoritmo: proyecta cada punto a píxeles absolutos al zoom actual
 * (fórmula estándar de tiles Web Mercator/OSM), los agrupa en una grilla
 * de gridSizePx × gridSizePx, y cada celda con más de un punto se colapsa
 * en un cluster centrado en el promedio de sus coordenadas. Es O(n), sin
 * dependencias, y se re-ejecuta cada vez que cambia el zoom o el set de
 * actividades (ver MapView.vue).
 */

export interface ClusterPoint {
  id: string
  lat: number
  lng: number
}

export interface SingleMarker<T extends ClusterPoint> {
  type: 'point'
  point: T
}

export interface ClusterMarker<T extends ClusterPoint> {
  type: 'cluster'
  id: string
  lat: number
  lng: number
  count: number
  points: T[]
}

export type ClusterResult<T extends ClusterPoint> = SingleMarker<T> | ClusterMarker<T>

const TILE_SIZE = 256

/** Proyección Web Mercator estándar (la misma que usan los tiles de OSM/
 * Google) — lat/lng → píxeles absolutos al zoom dado. Clampeada a
 * ±85.0511° (límite estándar de Web Mercator) para no romper con Infinity
 * en polos. */
function projectToPixels(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom
  const clampedLat = Math.max(Math.min(lat, 85.0511), -85.0511)
  const sinLat = Math.sin((clampedLat * Math.PI) / 180)
  const x = scale * (0.5 + lng / 360)
  const y = scale * (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI))
  return { x, y }
}

/**
 * Agrupa points en clusters según su proximidad en píxeles al zoom dado.
 * gridSizePx controla qué tan agresivo es el agrupamiento — más grande
 * junta más puntos por cluster (default 60px, similar al tamaño visual
 * de un pin + margen táctil).
 */
export function clusterPoints<T extends ClusterPoint>(
  points: T[],
  zoom: number,
  gridSizePx = 60
): ClusterResult<T>[] {
  const cells = new Map<string, T[]>()

  for (const point of points) {
    const { x, y } = projectToPixels(point.lat, point.lng, zoom)
    const cellKey = `${Math.floor(x / gridSizePx)}:${Math.floor(y / gridSizePx)}`
    const cell = cells.get(cellKey)
    if (cell) cell.push(point)
    else cells.set(cellKey, [point])
  }

  const results: ClusterResult<T>[] = []
  for (const cellPoints of cells.values()) {
    if (cellPoints.length === 1) {
      results.push({ type: 'point', point: cellPoints[0]! })
      continue
    }
    const avgLat = cellPoints.reduce((sum, p) => sum + p.lat, 0) / cellPoints.length
    const avgLng = cellPoints.reduce((sum, p) => sum + p.lng, 0) / cellPoints.length
    results.push({
      type: 'cluster',
      id: `cluster:${cellPoints.map((p) => p.id).join(',')}`,
      lat: avgLat,
      lng: avgLng,
      count: cellPoints.length,
      points: cellPoints,
    })
  }
  return results
}
