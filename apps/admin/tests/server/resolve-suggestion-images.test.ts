import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/utils/upload-image-from-url', () => ({
  uploadImageFromUrl: vi.fn(
    async (_supabase: unknown, url: string) => `https://storage.example/${url}`
  ),
}))

const { resolveSuggestionImages } = await import('../../server/utils/resolve-suggestion-images')
const { uploadImageFromUrl } = await import('../../server/utils/upload-image-from-url')

const fakeSupabase = {} as never

beforeEach(() => vi.clearAllMocks())

describe('resolveSuggestionImages', () => {
  it('returns suggestion.images as-is when already populated — no promotion needed', async () => {
    const result = await resolveSuggestionImages(
      fakeSupabase,
      {
        images: ['https://existing.example/a.jpg'],
        metadata: { photos: ['/api/places/photo?ref=x'] },
      },
      'google-key'
    )
    expect(result).toEqual(['https://existing.example/a.jpg'])
    expect(uploadImageFromUrl).not.toHaveBeenCalled()
  })

  it('promotes metadata.photos when suggestion.images is empty', async () => {
    const result = await resolveSuggestionImages(
      fakeSupabase,
      {
        images: [],
        metadata: { photos: ['/api/places/photo?ref=a', '/api/places/photo?ref=b'] },
      },
      'google-key'
    )
    expect(result).toEqual([
      'https://storage.example//api/places/photo?ref=a',
      'https://storage.example//api/places/photo?ref=b',
    ])
  })

  it('returns an empty array when there are neither images nor photos', async () => {
    const result = await resolveSuggestionImages(
      fakeSupabase,
      { images: null, metadata: null },
      'google-key'
    )
    expect(result).toEqual([])
    expect(uploadImageFromUrl).not.toHaveBeenCalled()
  })

  it('caps promotion at 5 photos', async () => {
    const photos = Array.from({ length: 8 }, (_, i) => `/api/places/photo?ref=${i}`)
    await resolveSuggestionImages(fakeSupabase, { images: [], metadata: { photos } }, 'google-key')
    expect(uploadImageFromUrl).toHaveBeenCalledTimes(5)
  })

  it('skips a photo that fails to upload instead of failing the whole batch', async () => {
    vi.mocked(uploadImageFromUrl)
      .mockResolvedValueOnce('https://storage.example/ok.jpg')
      .mockRejectedValueOnce(new Error('Google API error'))

    const result = await resolveSuggestionImages(
      fakeSupabase,
      {
        images: [],
        metadata: { photos: ['/api/places/photo?ref=ok', '/api/places/photo?ref=bad'] },
      },
      'google-key'
    )
    expect(result).toEqual(['https://storage.example/ok.jpg'])
  })
})
