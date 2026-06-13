<script setup lang="ts">
interface Props {
  photos: string[]
}

const props = defineProps<Props>()
const { t } = useI18n()

const visiblePhotos = computed(() => props.photos.slice(0, 9))
</script>

<template>
  <div v-if="visiblePhotos.length" class="photo-grid">
    <p class="photo-grid__label">{{ t('activity.photos') }}</p>
    <div class="photo-grid__cells">
      <img
        v-for="(url, i) in visiblePhotos"
        :key="i"
        :src="url"
        :alt="`photo-${i + 1}`"
        loading="lazy"
        class="photo-grid__img"
      />
    </div>
  </div>
</template>

<style scoped>
.photo-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.photo-grid__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin: 0;
}

.photo-grid__cells {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2, 0.5rem);
}

.photo-grid__img {
  aspect-ratio: 1 / 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-md, 0.5rem);
  overflow: hidden;
}
</style>
