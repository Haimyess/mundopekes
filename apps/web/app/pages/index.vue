<script setup lang="ts">
import type { HomeContextSection, HomeResponse } from '#shared/types/home'
import type { SearchResponse } from '#shared/types/search'

const { t } = useI18n()
const { tc } = useI18nContent()
const { getNavCategoriesWithChildren } = useCategories()

const { family, clear: forgetFamily } = useFamily()
const familyQuery = computed(() => (family.value ? toSearchQuery(family.value) : null))

const [{ data: home }, { data: categories }, { data: familyResults }] = await Promise.all([
  useFetch<HomeResponse>('/api/home', { key: 'home' }),
  useAsyncData('layout-nav-categories', getNavCategoriesWithChildren, { default: () => [] }),
  useAsyncData(
    'home-family',
    () =>
      familyQuery.value
        ? $fetch<SearchResponse>('/api/search', { query: familyQuery.value })
        : Promise.resolve(null),
    { watch: [familyQuery] }
  ),
])

const handleForgetFamily = () => forgetFamily()

useSeoMeta({
  title: () => t('home.seo.title'),
  description: () => t('home.seo.description'),
  ogTitle: () => t('home.seo.title'),
  ogDescription: () => t('home.seo.description'),
})

function contextTitle(context: HomeContextSection) {
  if (context.kind === 'occasion')
    return t('home.context.occasion', { name: tc(context.occasion.name) })
  return t(`home.context.${context.kind}`)
}

const categoryName = (slug: string) => {
  const category = categories.value.find((current) => current.slug === slug)
  return category ? tc(category.name_i18n) : slug
}
</script>

<template>
  <div class="home-page">
    <HomeHeroSearch :occasion="home?.occasion ?? null" />
    <HomeFamilySection
      v-if="family"
      :family="family"
      :results="familyResults ?? null"
      @forget="handleForgetFamily"
    />
    <HomeCarouselSection
      v-if="home?.context"
      :title="contextTitle(home.context)"
      :subtitle="t(`home.context.${home.context.kind}Subtitle`)"
      :section="home.context"
    />
    <HomeCategoryGrid :counts="home?.categoryCounts ?? {}" />
    <HomeNearby />
    <HomeCarouselSection
      v-if="home?.free"
      :title="t('home.free.title')"
      :subtitle="t('home.free.subtitle')"
      :section="home.free"
    />
    <HomeCarouselSection
      v-for="category in home?.categories ?? []"
      :key="category.slug"
      :title="categoryName(category.slug)"
      :section="category"
    />
    <HomeCtas />
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: var(--mp-section-gap);
  padding-block-end: var(--mp-section-gap);
}
</style>
