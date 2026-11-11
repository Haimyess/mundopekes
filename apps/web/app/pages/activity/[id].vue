<script setup lang="ts">
import type { ActivityDetail } from '#shared/types/detail'

const DESCRIPTION_MAX_LENGTH = 160

const route = useRoute()
const { t } = useI18n()
const { tc } = useI18nContent()
const { trackActivityView } = useTracking()

const id = computed(() => String(route.params.id))
const { record: activity } = await useDetailRecord<ActivityDetail>('activities', id)

const title = computed(() => (activity.value ? tc(activity.value.title) : ''))
const venueName = computed(() => (activity.value?.venue ? tc(activity.value.venue.name) : ''))
const subtitle = computed(() =>
  [
    activity.value?.categoryName ? tc(activity.value.categoryName) : null,
    venueName.value || null,
    activity.value?.venue?.cityName ?? null,
  ]
    .filter(Boolean)
    .join(' · ')
)
const description = computed(() =>
  activity.value?.description ? tc(activity.value.description) || null : null
)
const shareImage = computed(() => activity.value?.images.find((src) => src.startsWith('https://')))
const shareUrl = useRequestURL().href

const { absoluteLocaleUrl } = useSiteUrl()
const activityUrl = computed(() =>
  activity.value ? absoluteLocaleUrl(`/activity/${activity.value.id}`) : ''
)

useJsonLd('activity', () => {
  if (!activity.value) return null
  const venue = activity.value.venue
  return attractionSchema({
    name: title.value,
    url: activityUrl.value,
    description: description.value,
    images: activity.value.images,
    cityName: venue?.cityName ?? null,
    address: venue?.address ?? null,
    location: activity.value.location,
    telephone: activity.value.contact.phone,
    isFree: activity.value.isFree,
    hours: activity.value.hours.weekly,
    venue: venue ? { name: venueName.value, url: absoluteLocaleUrl(`/place/${venue.id}`) } : null,
  })
})

useJsonLd('breadcrumbs', () => {
  if (!activity.value) return null
  const categoryCrumb =
    activity.value.categorySlug && activity.value.categoryName
      ? [
          {
            name: tc(activity.value.categoryName),
            url: absoluteLocaleUrl(`${SEARCH_PATH}?category=${activity.value.categorySlug}`),
          },
        ]
      : []
  return breadcrumbSchema([
    { name: t('layout.breadcrumbHome'), url: absoluteLocaleUrl('/') },
    ...categoryCrumb,
    { name: title.value, url: activityUrl.value },
  ])
})

useSeoMeta({
  title: () => `${title.value} · MundoPekes`,
  description: () => description.value?.slice(0, DESCRIPTION_MAX_LENGTH) ?? '',
  ogTitle: () => title.value,
  ogImage: () => shareImage.value,
})

watch(
  () => activity.value?.id,
  (activityId) => {
    if (activityId && activity.value) {
      trackActivityView({
        id: activityId,
        title: title.value,
        category: activity.value.categorySlug ?? '',
        city: activity.value.venue?.cityName ?? '',
      })
    }
  },
  { immediate: true }
)
</script>

<template>
  <article v-if="activity" class="activity-page">
    <div class="activity-page__main">
      <DetailGallery :images="activity.images" :name="title" />
      <div class="activity-page__heading">
        <DetailSummary
          :title="title"
          :subtitle="subtitle"
          :age-span="activity.ageSpan"
          :is-free="activity.isFree"
          :price="activity.price"
          :is-open-now="activity.hours.isOpenNow"
        />
        <ActivityShareModal :title="title" :url="shareUrl" />
      </div>
      <DetailQuickActions
        :contact="activity.contact"
        target-type="activity"
        :target-id="activity.id"
      />
      <DetailSection v-if="description" :title="t('detail.aboutActivity')">
        <p class="activity-page__description">{{ description }}</p>
      </DetailSection>
      <DetailSection
        v-if="activity.amenities.length || activity.discounts.length"
        :title="t('detail.amenities')"
      >
        <DetailAmenities :amenities="activity.amenities" :discounts="activity.discounts" />
      </DetailSection>
      <DetailSection :title="t('detail.hours')">
        <DetailHours :hours="activity.hours" />
      </DetailSection>
      <DetailSection
        v-if="activity.moreAtPlace.length"
        :title="t('detail.moreAtPlace', { place: venueName })"
      >
        <SearchResultList :items="activity.moreAtPlace" :is-loading="false" :has-error="false" />
      </DetailSection>
      <div class="activity-page__report">
        <ActivityReportActivityButton :activity-id="activity.id" :activity-title="title" />
      </div>
    </div>
    <aside class="activity-page__aside" :aria-label="t('detail.location')">
      <DetailSection :title="t('detail.location')">
        <DetailVenueCard v-if="activity.venue" :venue="activity.venue" />
        <DetailLocation
          :name="venueName || title"
          :location="activity.location"
          :address="activity.venue?.address"
          :city-name="activity.venue?.cityName"
        />
      </DetailSection>
    </aside>
    <DetailActionBar :contact="activity.contact" target-type="activity" :target-id="activity.id" />
  </article>
</template>

<style scoped>
.activity-page {
  display: flex;
  flex-direction: column;
  padding-block: 16px 0;
}

.activity-page__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-page__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-block-start: 4px;
}

.activity-page__description {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body);
  line-height: 1.6;
  white-space: pre-line;
}

.activity-page__report {
  padding-block: 20px;
  border-block-start: 1px solid var(--mp-border-soft);
}

@media (min-width: 1200px) {
  .activity-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 40px;
    align-items: start;
    padding-block-end: var(--mp-section-gap);
  }

  .activity-page__aside {
    position: sticky;
    inset-block-start: 16px;
  }
}
</style>
