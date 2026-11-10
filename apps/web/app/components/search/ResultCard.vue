<script setup lang="ts">
import type { SearchResultItem } from '#shared/types/search'

interface Props {
  item: SearchResultItem
  headingLevel?: 2 | 3
  isEager?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  headingLevel: 2,
  isEager: false,
})

const { t, locale } = useI18n()
const { tc } = useI18nContent()

const PROXIED_IMAGE_PREFIX = '/api/'

const isImageOptimized = computed(() => !props.item.imageUrl?.startsWith(PROXIED_IMAGE_PREFIX))

const title = computed(() => tc(props.item.title))
const detailPath = computed(() => `/${props.item.kind}/${props.item.id}`)

const kindLabel = computed(() => {
  if (props.item.kind === 'activity') return t('results.kind.activity')
  return t('results.activityCount', props.item.activityCount ?? 0)
})

const context = computed(() =>
  [props.item.placeName ? tc(props.item.placeName) : null, props.item.cityName]
    .filter(Boolean)
    .join(' · ')
)

const priceLabel = computed(() => {
  if (props.item.isFree || props.item.price === 0) return t('results.free')
  return props.item.price === null ? null : formatPrice(props.item.price, locale.value)
})

const ageSpan = computed(() => props.item.ageSpan)

const fitLabel = computed(() =>
  props.item.fit === 'some'
    ? t('results.forAges', { ages: props.item.matchingAges.join(', ') })
    : null
)
</script>

<template>
  <UiMediaCard
    :title="title"
    :to="detailPath"
    :image-src="item.imageUrl"
    :is-image-optimized="isImageOptimized"
    :image-alt="''"
    :heading-level="headingLevel"
    :is-eager="isEager"
    aspect-ratio="1/1"
    image-sizes="(min-width: 1200px) 220px, (min-width: 768px) 30vw, 45vw"
  >
    <template v-if="ageSpan" #badge>
      <span
        class="result-card__ages"
        :aria-label="t('results.agesLabel', { min: ageSpan.min, max: ageSpan.max })"
      >
        <span dir="ltr" aria-hidden="true">{{ ageSpan.min }}–{{ ageSpan.max }}</span>
      </span>
    </template>
    <p class="result-card__kind">
      <span v-if="item.kind === 'place'">{{ t('results.kind.place') }} · </span>{{ kindLabel }}
    </p>
    <p v-if="context" class="result-card__context">{{ context }}</p>
    <p v-if="priceLabel" class="result-card__price">
      <span dir="ltr">{{ priceLabel }}</span>
    </p>
    <p v-if="fitLabel" class="result-card__fit">{{ fitLabel }}</p>
  </UiMediaCard>
</template>

<style scoped>
.result-card__ages {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  color: var(--mp-ink);
  font-size: var(--mp-fs-label-sm);
  font-weight: var(--mp-fw-semibold);
}

.result-card__kind,
.result-card__context {
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-label-sm);
}

.result-card__context {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-card__price {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body-sm);
  font-weight: var(--mp-fw-semibold);
}

.result-card__fit {
  align-self: flex-start;
  margin: 0;
  padding: 2px 8px;
  border-radius: var(--mp-r-pill);
  background: var(--mp-coral-50);
  color: var(--mp-coral-700);
  font-size: var(--mp-fs-label-sm);
}
</style>
