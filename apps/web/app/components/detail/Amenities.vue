<script setup lang="ts">
import type { SearchAmenity, SearchDiscount } from '@mundopekes/core'

interface Props {
  amenities: readonly SearchAmenity[]
  discounts: readonly SearchDiscount[]
}

const props = defineProps<Props>()

const AMENITY_ICONS: Record<SearchAmenity, string> = {
  stroller: 'i-hugeicons-baby-02',
  wheelchair: 'i-hugeicons-wheelchair',
  bathrooms: 'i-hugeicons-toilet-01',
  'changing-table': 'i-hugeicons-baby-bottle',
  'safe-room': 'i-hugeicons-shield-01',
  parking: 'i-hugeicons-car-parking-01',
  kosher: 'i-hugeicons-restaurant-01',
  shade: 'i-hugeicons-umbrella',
}
const DISCOUNT_ICON = 'i-hugeicons-discount-tag-01'

const { t } = useI18n()

const items = computed(() => [
  ...props.amenities.map((amenity) => ({
    key: amenity,
    icon: AMENITY_ICONS[amenity],
    label: t(`results.filters.amenities.${amenity}`),
  })),
  ...props.discounts.map((discount) => ({
    key: discount,
    icon: DISCOUNT_ICON,
    label: t(`results.filters.discounts.${discount}`),
  })),
])
</script>

<template>
  <ul v-if="items.length" class="detail-amenities">
    <li v-for="item in items" :key="item.key" class="detail-amenities__item">
      <UiIcon :name="item.icon" :size="20" />
      {{ item.label }}
    </li>
  </ul>
</template>

<style scoped>
.detail-amenities {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.detail-amenities__item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body-sm);
}
</style>
