<script setup lang="ts">
import type { HomeSection } from '#shared/types/home'
import type { SearchResultItem } from '#shared/types/search'

interface Props {
  title: string
  section: HomeSection
  subtitle?: string
}

const props = withDefaults(defineProps<Props>(), { subtitle: undefined })

const { t } = useI18n()
const { searchLink } = useSearchLink()

const seeAllLink = computed(() => searchLink(props.section.query))
const itemKey = (item: SearchResultItem) => `${item.kind}-${item.id}`
</script>

<template>
  <section class="carousel-section">
    <UiSectionHeader
      :title="title"
      :subtitle="subtitle"
      :action-label="t('home.seeAll', { count: section.total })"
      :action-to="seeAllLink"
    />
    <UiCarousel
      :items="section.items"
      :label="title"
      :previous-label="t('home.previous')"
      :next-label="t('home.next')"
      :item-key="itemKey"
      item-width="clamp(160px, 42vw, 240px)"
    >
      <template #item="{ item }">
        <SearchResultCard :item="item" :heading-level="3" />
      </template>
    </UiCarousel>
  </section>
</template>

<style scoped>
.carousel-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
