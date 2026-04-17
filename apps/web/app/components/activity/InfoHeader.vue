<script setup lang="ts">
/**
 * Activity > InfoHeader
 * Título, ubicación y badges — igual que el header original de ActivityInfo
 */
import type { Activity } from '~/types'

interface Props {
  activity: Activity
}

const props = defineProps<Props>()
const { t } = useI18n()

const cityName  = computed(() => props.activity?.place?.city?.name ?? null)
const placeName = computed(() => props.activity?.place?.name ?? null)

const badges = computed(() => {
  if (!props.activity) return []
  const list = []

  if (props.activity.is_free) {
    list.push({
      label: t('activity.free'),
      variant: 'success' as const,
      icon: 'i-heroicons-banknotes',
      color: 'success' as const
    })
  }
  if (props.activity.stroller_friendly) {
    list.push({
      label: t('activity.stroller_friendly'),
      variant: 'info' as const,
      icon: 'i-heroicons-heart',
      color: 'info' as const
    })
  }
  if (props.activity.open_weekends) {
    list.push({
      label: t('activity.open_weekends'),
      variant: 'warning' as const,
      icon: 'i-heroicons-calendar-days',
      color: 'warning' as const
    })
  }

  return list
})
</script>

<template>
  <div class="space-y-4">

    <!-- Título + ubicación -->
    <div>
      <h1 class="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
        {{ activity.title }}
      </h1>

      <div v-if="cityName || placeName" class="flex items-center gap-1.5 text-gray-500">
        <UIcon name="i-heroicons-map-pin" class="w-4 h-4 flex-shrink-0 text-primary-500" />
        <span class="text-sm font-medium">
          <template v-if="cityName">{{ cityName }}</template>
          <template v-if="cityName && placeName"> · </template>
          <template v-if="placeName">{{ placeName }}</template>
        </span>
      </div>
    </div>

    <!-- Badges -->
    <div v-if="badges.length" class="flex flex-wrap gap-2">
      <UBadge
        v-for="badge in badges"
        :key="badge.label"
        :color="badge.color"
        variant="subtle"
        size="md"
        class="flex items-center gap-1.5 px-3 py-1.5"
      >
        <UIcon :name="badge.icon" class="w-3.5 h-3.5" />
        {{ badge.label }}
      </UBadge>
    </div>

  </div>
</template>