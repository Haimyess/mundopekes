import { isOpenNow, ISRAEL_TIME_ZONE, toZonedMoment } from '@mundopekes/core'
import { entityIdSchema } from '@mundopekes/schemas'
import type { PlaceDetail } from '#shared/types/detail'
import { buildContact, metadataText } from '../../utils/detail-contact'
import { getPlaceStatus, getSearchDataset } from '../../utils/search-dataset'
import { buildPlaceRecords, toListedResultItem } from '../../utils/search-records'

const MAX_GALLERY_IMAGES = 12
const INACTIVE_STATUS = 'inactive'

function galleryImages(images: readonly string[] | null, metadata: Record<string, unknown> | null) {
  const photos = Array.isArray(metadata?.photos) ? metadata.photos : []
  const candidates = [...(images ?? []), ...photos, metadata?.place_photo_url]
  return [
    ...new Set(candidates.filter((src): src is string => typeof src === 'string' && !!src)),
  ].slice(0, MAX_GALLERY_IMAGES)
}

function byNewest(first: { createdAt: string }, second: { createdAt: string }) {
  return second.createdAt.localeCompare(first.createdAt)
}

export default defineEventHandler(async (event): Promise<PlaceDetail> => {
  const id = entityIdSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const records = buildPlaceRecords(await getSearchDataset(event), id.data)
  if (!records) {
    const status = await getPlaceStatus(event, id.data)
    throw createError(
      status === INACTIVE_STATUS
        ? { statusCode: 410, statusMessage: 'Gone' }
        : { statusCode: 404, statusMessage: 'Not Found' }
    )
  }

  const { place, record, activities } = records
  const now = new Date()
  const weekly = record.weeklyHours

  return {
    id: place.id,
    name: record.item.title,
    description: place.description_i18n ?? null,
    images: galleryImages(place.images, place.metadata),
    cityName: record.item.cityName,
    address: metadataText(place.metadata, 'address'),
    location: record.location,
    contact: buildContact(place.metadata, record.location),
    hours: {
      weekly,
      isOpenNow: weekly ? isOpenNow(weekly, now) : null,
      today: toZonedMoment(now, ISRAEL_TIME_ZONE).weekday,
    },
    amenities: [...record.amenities],
    discounts: [...record.discounts],
    isFree: record.isFree,
    price: record.price,
    ageSpan: record.item.ageSpan,
    activities: [...activities].sort(byNewest).map(toListedResultItem),
    updatedAt: place.updated_at ?? null,
  }
})
