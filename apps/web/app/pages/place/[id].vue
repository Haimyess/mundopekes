<script setup lang="ts">
const DESCRIPTION_MAX_LENGTH = 160

const route = useRoute()
const { t } = useI18n()
const { tc } = useI18nContent()
const { trackPlaceView } = useTracking()

const id = computed(() => String(route.params.id))
const { place } = await usePlaceDetail(id)

const name = computed(() => (place.value ? tc(place.value.name) : ''))
const description = computed(() =>
  place.value?.description ? tc(place.value.description) || null : null
)
const shareImage = computed(() => place.value?.images.find((src) => src.startsWith('https://')))

useSeoMeta({
  title: () => `${name.value} · MundoPekes`,
  description: () => description.value?.slice(0, DESCRIPTION_MAX_LENGTH) ?? '',
  ogTitle: () => name.value,
  ogImage: () => shareImage.value,
})

watch(
  () => place.value?.id,
  (placeId) => {
    if (placeId && place.value) {
      trackPlaceView({ id: placeId, title: name.value, city: place.value.cityName ?? '' })
    }
  },
  { immediate: true }
)
</script>

<template>
  <article v-if="place" class="place-page">
    <div class="place-page__main">
      <DetailGallery :images="place.images" :name="name" />
      <DetailSummary
        class="place-page__summary"
        :title="name"
        :subtitle="place.cityName"
        :age-span="place.ageSpan"
        :is-free="place.isFree"
        :price="place.price"
        :is-open-now="place.hours.isOpenNow"
      />
      <DetailQuickActions :contact="place.contact" target-type="place" :target-id="place.id" />
      <DetailSection v-if="description" :title="t('detail.about')">
        <p class="place-page__description">{{ description }}</p>
      </DetailSection>
      <DetailSection :title="t('detail.activities')">
        <SearchResultList
          v-if="place.activities.length"
          :items="place.activities"
          :is-loading="false"
          :has-error="false"
        />
        <p v-else class="place-page__muted">{{ t('detail.noActivities') }}</p>
      </DetailSection>
      <DetailSection
        v-if="place.amenities.length || place.discounts.length"
        :title="t('detail.amenities')"
      >
        <DetailAmenities :amenities="place.amenities" :discounts="place.discounts" />
      </DetailSection>
      <DetailSection :title="t('detail.hours')">
        <DetailHours :hours="place.hours" />
      </DetailSection>
    </div>
    <aside class="place-page__aside" :aria-label="t('detail.location')">
      <DetailSection :title="t('detail.location')">
        <DetailLocation
          :name="name"
          :location="place.location"
          :address="place.address"
          :city-name="place.cityName"
        />
      </DetailSection>
    </aside>
    <DetailActionBar :contact="place.contact" target-type="place" :target-id="place.id" />
  </article>
</template>

<style scoped>
.place-page {
  display: flex;
  flex-direction: column;
  padding-block: 16px 0;
}

.place-page__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.place-page__summary {
  padding-block-start: 4px;
}

.place-page__description {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body);
  line-height: 1.6;
  white-space: pre-line;
}

.place-page__muted {
  margin: 0;
  color: var(--mp-text-2);
}

@media (min-width: 1200px) {
  .place-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 40px;
    align-items: start;
    padding-block-end: var(--mp-section-gap);
  }

  .place-page__aside {
    position: sticky;
    inset-block-start: 16px;
  }
}
</style>
