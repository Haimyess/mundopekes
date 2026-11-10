<script setup lang="ts">
import {
  SEARCH_AMENITY_METADATA_KEYS,
  SEARCH_DISCOUNTS,
  SEARCH_DISCOUNTS_METADATA_KEY,
  type SearchAmenity,
  type SearchDiscount,
} from '@mundopekes/core'

type PlaceMetadata = Record<string, unknown>

const PLACE_SERVICE_AMENITIES: readonly SearchAmenity[] = [
  'wheelchair',
  'changing-table',
  'parking',
  'kosher',
]

const metadata = defineModel<PlaceMetadata>({ required: true })

const { t } = useI18n()

const declaredDiscounts = computed<SearchDiscount[]>(() => {
  const value = metadata.value[SEARCH_DISCOUNTS_METADATA_KEY]
  return Array.isArray(value) ? SEARCH_DISCOUNTS.filter((discount) => value.includes(discount)) : []
})

const amenityOptions = computed(() =>
  PLACE_SERVICE_AMENITIES.map((amenity) => {
    const key = SEARCH_AMENITY_METADATA_KEYS[amenity]
    return {
      key,
      label: t(`placeServices.amenities.${amenity}`),
      isChecked: metadata.value[key] === true,
    }
  })
)

const discountOptions = computed(() =>
  SEARCH_DISCOUNTS.map((discount) => ({
    discount,
    label: t(`placeServices.discounts.${discount}`),
    isChecked: declaredDiscounts.value.includes(discount),
  }))
)

const handleAmenityChange = (key: string, isChecked: boolean) => {
  metadata.value = { ...metadata.value, [key]: isChecked }
}

const handleDiscountChange = (discount: SearchDiscount, isChecked: boolean) => {
  const others = declaredDiscounts.value.filter((current) => current !== discount)
  const next = isChecked ? [...others, discount] : others
  metadata.value = {
    ...metadata.value,
    [SEARCH_DISCOUNTS_METADATA_KEY]: SEARCH_DISCOUNTS.filter((value) => next.includes(value)),
  }
}
</script>

<template>
  <fieldset class="place-services">
    <legend class="place-services__legend">{{ t('placeServices.title') }}</legend>
    <div class="place-services__group">
      <UiCheckbox
        v-for="option in amenityOptions"
        :key="option.key"
        :model-value="option.isChecked"
        :label="option.label"
        @update:model-value="handleAmenityChange(option.key, $event)"
      />
    </div>
    <p class="place-services__subtitle">{{ t('placeServices.discountsTitle') }}</p>
    <div class="place-services__group">
      <UiCheckbox
        v-for="option in discountOptions"
        :key="option.discount"
        :model-value="option.isChecked"
        :label="option.label"
        @update:model-value="handleDiscountChange(option.discount, $event)"
      />
    </div>
  </fieldset>
</template>

<style scoped>
.place-services {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
}

.place-services__legend,
.place-services__subtitle {
  margin: 0 0 4px;
  padding: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.place-services__subtitle {
  margin-block-start: 8px;
}

.place-services__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
