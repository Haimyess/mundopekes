const MAX_GALLERY_IMAGES = 12

export function galleryImages(...sources: readonly unknown[]): string[] {
  const candidates = sources.flatMap((source) => (Array.isArray(source) ? source : [source]))
  return [
    ...new Set(candidates.filter((src): src is string => typeof src === 'string' && !!src)),
  ].slice(0, MAX_GALLERY_IMAGES)
}
