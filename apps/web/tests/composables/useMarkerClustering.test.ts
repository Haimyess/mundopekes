import { describe, it, expect } from 'vitest'
import { clusterPoints, type ClusterPoint } from '~/app/composables/useMarkerClustering'

function point(id: string, lat: number, lng: number): ClusterPoint {
  return { id, lat, lng }
}

describe('clusterPoints', () => {
  it('returns a single point marker when there is only one point', () => {
    const result = clusterPoints([point('a', 32.08, 34.78)], 12)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ type: 'point', point: { id: 'a' } })
  })

  it('keeps far-apart points as separate markers at a normal zoom', () => {
    // Tel Aviv vs Jerusalem — ~50km apart, should never collapse at zoom 12
    const result = clusterPoints(
      [point('tlv', 32.0853, 34.7818), point('jlm', 31.7683, 35.2137)],
      12
    )
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.type === 'point')).toBe(true)
  })

  it('clusters points that are very close together at low zoom', () => {
    const result = clusterPoints(
      [point('a', 32.08, 34.78), point('b', 32.0801, 34.7801), point('c', 32.0799, 34.7799)],
      3 // zoom bajo — 60px de grilla cubre una región geográfica grande
    )
    expect(result).toHaveLength(1)
    const cluster = result[0]
    expect(cluster?.type).toBe('cluster')
    if (cluster?.type === 'cluster') {
      expect(cluster.count).toBe(3)
      expect(cluster.points.map((p) => p.id).sort()).toEqual(['a', 'b', 'c'])
      // Centroide: promedio de las 3 coordenadas
      expect(cluster.lat).toBeCloseTo((32.08 + 32.0801 + 32.0799) / 3, 4)
    }
  })

  it('splits a cluster into individual points as zoom increases', () => {
    // ~500m apart — close enough to cluster at low zoom, far enough to
    // split once each pixel represents well under a meter (high zoom)
    const points = [point('a', 32.08, 34.78), point('b', 32.0845, 34.78)]
    const lowZoom = clusterPoints(points, 3)
    const highZoom = clusterPoints(points, 18)

    expect(lowZoom).toHaveLength(1)
    expect(lowZoom[0]?.type).toBe('cluster')

    expect(highZoom).toHaveLength(2)
    expect(highZoom.every((r) => r.type === 'point')).toBe(true)
  })

  it('returns an empty array for an empty input', () => {
    expect(clusterPoints([], 10)).toEqual([])
  })

  it('respects a custom gridSizePx', () => {
    const points = [point('a', 32.08, 34.78), point('b', 32.09, 34.79)]
    // A tiny grid should keep them separate even at a zoom where the
    // default 60px grid would merge them
    const tightGrid = clusterPoints(points, 10, 1)
    expect(tightGrid).toHaveLength(2)
  })
})
