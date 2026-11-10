import { isOpenNow, ISRAEL_TIME_ZONE, toZonedMoment } from '@mundopekes/core'
import { entityIdSchema } from '@mundopekes/schemas'
import type { ActivityDetail } from '#shared/types/detail'
import { buildContact, metadataText, safeWebsite } from '../../utils/detail-contact'
import { galleryImages } from '../../utils/detail-images'
import { getActivityStatus, getSearchDataset } from '../../utils/search-dataset'
import { buildActivityRecords, toListedResultItem } from '../../utils/search-records'

const GONE_STATUSES = new Set(['archived', 'closed', 'inactive'])
const INACTIVE_PLACE_STATUS = 'inactive'
const NOT_FOUND = { statusCode: 404, statusMessage: 'Not Found' }
const GONE = { statusCode: 410, statusMessage: 'Gone' }

async function missingActivityError(event: Parameters<typeof getActivityStatus>[0], id: string) {
  const state = await getActivityStatus(event, id)
  if (!state) return createError(NOT_FOUND)
  const isGone =
    GONE_STATUSES.has(state.status ?? '') || state.placeStatus === INACTIVE_PLACE_STATUS
  return createError(isGone ? GONE : NOT_FOUND)
}

export default defineEventHandler(async (event): Promise<ActivityDetail> => {
  const id = entityIdSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError(NOT_FOUND)

  const records = buildActivityRecords(await getSearchDataset(event), id.data)
  if (!records) throw await missingActivityError(event, id.data)

  const { activity, record, place, category, siblings } = records
  const now = new Date()
  const weekly = record.weeklyHours
  const contact = buildContact(place?.metadata, record.location)

  return {
    id: activity.id,
    title: record.item.title,
    description: activity.description_i18n ?? null,
    categoryName: category?.name_i18n ?? null,
    categorySlug: category?.slug ?? null,
    images: galleryImages(
      activity.images,
      place?.images,
      place?.metadata?.photos,
      place?.metadata?.place_photo_url
    ),
    venue: place
      ? {
          id: place.id,
          name: place.name_i18n ?? {},
          cityName: record.item.cityName,
          address: metadataText(place.metadata, 'address'),
          imageUrl: galleryImages(place.images, place.metadata?.place_photo_url)[0] ?? null,
        }
      : null,
    location: record.location,
    contact: { ...contact, website: safeWebsite(activity.metadata?.website) ?? contact.website },
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
    moreAtPlace: siblings.map(toListedResultItem),
    updatedAt: activity.updated_at ?? null,
  }
})
