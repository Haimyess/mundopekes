import { describe, expect, it } from 'vitest'
import { absoluteUrl, brandTitle, isIndexableSearch } from '~/app/utils/seo'
import { parseSearchQuery } from '~/app/utils/search-query'

const indexable = (query: Record<string, string>) => isIndexableSearch(parseSearchQuery(query))

describe('brandTitle', () => {
  it('adds the brand once', () => {
    expect(brandTitle('Parque Yarkon')).toBe('Parque Yarkon · MundoPekes')
    expect(brandTitle('Parque Yarkon · MundoPekes')).toBe('Parque Yarkon · MundoPekes')
    expect(brandTitle(undefined)).toBe('MundoPekes')
  })
})

describe('absoluteUrl', () => {
  it('joins the site URL and a path without doubling slashes', () => {
    expect(absoluteUrl('https://mundopekes.com/', '/place/1')).toBe(
      'https://mundopekes.com/place/1'
    )
    expect(absoluteUrl('https://mundopekes.com', 'search')).toBe('https://mundopekes.com/search')
    expect(absoluteUrl('https://mundopekes.com', 'https://cdn.test/a.png')).toBe(
      'https://cdn.test/a.png'
    )
  })
})

describe('isIndexableSearch', () => {
  it('indexes stable landing searches', () => {
    expect(indexable({})).toBe(true)
    expect(indexable({ category: 'aire-libre', where: 'city:tel-aviv' })).toBe(true)
    expect(indexable({ when: 'shabat', free: 'true' })).toBe(true)
    expect(indexable({ when: 'occasion:hanukkah', page: '2' })).toBe(true)
  })

  it('keeps personal or short lived searches out of the index', () => {
    expect(indexable({ q: 'museo' })).toBe(false)
    expect(indexable({ ages: '3,7' })).toBe(false)
    expect(indexable({ when: 'today' })).toBe(false)
    expect(indexable({ when: 'fixed:2026-12-01' })).toBe(false)
    expect(indexable({ where: 'point:32.08,34.78' })).toBe(false)
    expect(indexable({ sort: 'price' })).toBe(false)
    expect(indexable({ open: 'now' })).toBe(false)
  })
})
