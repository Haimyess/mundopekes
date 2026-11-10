import { beforeEach, describe, expect, it, vi } from 'vitest'

type RawHandler = (url: string, options: Record<string, unknown>) => Promise<{ headers: Headers }>

const rawCalls: [string, Record<string, unknown>][] = []
let rawHandler: RawHandler = async () => ({ headers: new Headers() })

vi.stubGlobal('$fetch', {
  raw: (url: string, options: Record<string, unknown>) => {
    rawCalls.push([url, options])
    return rawHandler(url, options)
  },
})

const { extractGooglePlaceId, resolveGooglePlaceId } =
  await import('../../server/utils/google-place-link')

const PLACE_ID = 'ChIJH3w7GaZMHRURkD-WwKJy-8E'

describe('extractGooglePlaceId', () => {
  it('reads place ids from Google Maps links', () => {
    expect(
      extractGooglePlaceId(
        `https://www.google.com/maps/search/?api=1&query=x&query_place_id=${PLACE_ID}`
      )
    ).toBe(PLACE_ID)
    expect(
      extractGooglePlaceId(`https://www.google.co.il/maps/place/?q=place_id:${PLACE_ID}`)
    ).toBe(PLACE_ID)
  })

  it('ignores other hosts and links without a place id', () => {
    expect(extractGooglePlaceId(`https://evil.example/?query_place_id=${PLACE_ID}`)).toBeNull()
    expect(extractGooglePlaceId('https://www.google.com/maps/@32.08,34.78,15z')).toBeNull()
    expect(extractGooglePlaceId('not a url')).toBeNull()
  })
})

describe('resolveGooglePlaceId', () => {
  beforeEach(() => {
    rawCalls.length = 0
    rawHandler = async () => ({ headers: new Headers() })
  })

  it('follows one redirect of an allowed short link', async () => {
    rawHandler = async () => ({
      headers: new Headers({
        location: `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`,
      }),
    })
    await expect(resolveGooglePlaceId('https://maps.app.goo.gl/abc123')).resolves.toBe(PLACE_ID)
    expect(rawCalls).toEqual([
      [
        'https://maps.app.goo.gl/abc123',
        expect.objectContaining({ method: 'HEAD', redirect: 'manual' }),
      ],
    ])
  })

  it('never requests hosts outside the short-link allowlist', async () => {
    await expect(resolveGooglePlaceId('https://instagram.com/granja')).resolves.toBeNull()
    await expect(resolveGooglePlaceId('http://maps.app.goo.gl/abc')).resolves.toBeNull()
    await expect(resolveGooglePlaceId('https://127.0.0.1/admin')).resolves.toBeNull()
    expect(rawCalls).toHaveLength(0)
  })

  it('returns null without a link or when the short link fails', async () => {
    await expect(resolveGooglePlaceId(undefined)).resolves.toBeNull()
    rawHandler = () => Promise.reject(new Error('timeout'))
    await expect(resolveGooglePlaceId('https://maps.app.goo.gl/abc123')).resolves.toBeNull()
    expect(rawCalls).toHaveLength(1)
  })
})
