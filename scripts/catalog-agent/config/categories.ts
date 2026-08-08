// Copied verbatim from layers/domain/server/utils/places-logic.ts
// These UUIDs are the real category_id values from the Supabase `categories` table.
export const GOOGLE_TYPES_MAP: Record<string, { id: string; name: string }> = {
  beach: { id: '30d7ea34-bcf8-4209-b418-cdede2e431e6', name: 'Agua y playas' },
  park: { id: '5364a238-ba30-4d4c-846d-91bb0fda0095', name: 'Parques' },
  natural_feature: { id: '3e9f033e-f594-488d-98bf-a809cbd91299', name: 'Naturaleza' },
  nature_reserve: { id: '3e9f033e-f594-488d-98bf-a809cbd91299', name: 'Naturaleza' },
  museum: { id: '0f35ac9a-3c24-4224-ad35-0de0a7ff7035', name: 'Museos' },
  art_gallery: { id: '2027495d-0003-4308-b16b-586dfea6adbb', name: 'Arte' },
  place_of_worship: { id: 'a1287296-46a8-4973-b892-5dca978c06a7', name: 'Religioso' },
  zoo: { id: 'f5adf8e8-bb7b-4b12-af87-0789a401149c', name: 'Animales' },
  aquarium: { id: 'f5adf8e8-bb7b-4b12-af87-0789a401149c', name: 'Animales' },
  amusement_park: { id: '4de2060d-173a-4733-8bb4-10d25c1a622d', name: 'Juego y recreo' },
  campground: { id: '49ca0529-1130-43f7-a439-3198d7ac5b56', name: 'Camping' },
  restaurant: { id: '05031276-9b35-4d51-b4d4-2da8de4e03fe', name: 'Gastronomía' },
  food: { id: '05031276-9b35-4d51-b4d4-2da8de4e03fe', name: 'Gastronomía' },
  stadium: { id: 'fdbe1e25-ee11-484f-9177-99ffe978a8d5', name: 'Deportes' },
  gym: { id: 'fdbe1e25-ee11-484f-9177-99ffe978a8d5', name: 'Deportes' },
  ski_resort: { id: '3c9bd581-ea1b-4e96-b2f1-d45775425e46', name: 'Ski' },
  library: { id: '82e97ad6-e5a9-46cb-a394-209b593d5526', name: 'Educativo' },
  school: { id: '82e97ad6-e5a9-46cb-a394-209b593d5526', name: 'Educativo' },
  tourist_attraction: { id: 'a95dbfb7-1324-48c6-9aa1-43952c21151a', name: 'Historia' },
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Deduped by category id — this is what gets passed to Claude Haiku for category selection.
export const CATEGORIES_LIST: Array<{ id: string; name: string; slug: string }> = (() => {
  const seen = new Set<string>()
  const list: Array<{ id: string; name: string; slug: string }> = []
  for (const { id, name } of Object.values(GOOGLE_TYPES_MAP)) {
    if (seen.has(id)) continue
    seen.add(id)
    list.push({ id, name, slug: slugify(name) })
  }
  return list
})()
