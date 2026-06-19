<script setup lang="ts">
interface Props {
  phone: string | null
  website: string | null
  googleUrl: string | null
  openingHours: { weekday_text: string[] } | null
  wheelchairAccessible: boolean | null
}

defineProps<Props>()
const { t } = useI18n()

function stripDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
</script>

<template>
  <div class="info-card">
    <!-- Opening Hours -->
    <details v-if="openingHours?.weekday_text?.length" class="info-card__hours">
      <summary class="info-card__row">
        <UiIcon name="i-lucide-clock" size="sm" />
        <span class="info-card__label">{{ t('activity.hours') }}</span>
      </summary>
      <ul class="info-card__hours-list">
        <li v-for="line in openingHours.weekday_text" :key="line" class="info-card__hours-item">
          {{ line }}
        </li>
      </ul>
    </details>

    <!-- Phone -->
    <div v-if="phone" class="info-card__row">
      <UiIcon name="i-lucide-phone" size="sm" />
      <a :href="`tel:${phone}`" class="info-card__link">{{ phone }}</a>
    </div>

    <!-- Website -->
    <div v-if="website" class="info-card__row">
      <UiIcon name="i-lucide-globe" size="sm" />
      <a :href="website" target="_blank" rel="noopener" class="info-card__link">
        {{ stripDomain(website) }}
      </a>
    </div>

    <!-- Google Maps -->
    <div v-if="googleUrl" class="info-card__row">
      <UiIcon name="i-lucide-map-pin" size="sm" />
      <a :href="googleUrl" target="_blank" rel="noopener" class="info-card__link">
        {{ t('activity.view_on_maps') }}
      </a>
    </div>

    <!-- Wheelchair accessible -->
    <div v-if="wheelchairAccessible === true" class="info-card__row">
      <UiIcon name="i-lucide-accessibility" size="sm" />
      <span>{{ t('activity.wheelchair') }}</span>
    </div>
  </div>
</template>

<style scoped>
.info-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg, 0.75rem);
  border: 1px solid var(--color-neutral-200);
}

.info-card__hours {
  display: flex;
  flex-direction: column;
}

.info-card__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1-5, 0.375rem) 0;
  font-size: var(--font-size-sm);
  cursor: pointer;
  list-style: none;
}

.info-card__label {
  font-weight: var(--font-weight-medium);
}

.info-card__link {
  color: var(--color-primary-600);
  text-decoration: none;
}

.info-card__link:hover {
  text-decoration: underline;
}

.info-card__hours-list {
  margin-block-start: var(--space-1);
  margin-inline-start: var(--space-7, 1.75rem);
  padding: 0;
  list-style: none;
}

.info-card__hours-item {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--space-0-5, 0.125rem) 0;
}
</style>
