<script setup lang="ts">
interface Props {
  placeId: string
  placeName: string
}

defineProps<Props>()

const { t } = useI18n()
const isOpen = ref(false)
</script>

<template>
  <section class="claim-banner" aria-labelledby="claim-banner-title">
    <UiIcon name="i-hugeicons-store-01" :size="24" class="claim-banner__icon" />
    <div class="claim-banner__body">
      <h2 id="claim-banner-title" class="claim-banner__title">{{ t('claim.bannerTitle') }}</h2>
      <p class="claim-banner__text">{{ t('claim.bannerText') }}</p>
    </div>
    <BusinessClaimSheet v-model:open="isOpen" :place-id="placeId" :place-name="placeName">
      <template #trigger>
        <button type="button" class="claim-banner__action">{{ t('claim.action') }}</button>
      </template>
    </BusinessClaimSheet>
  </section>
</template>

<style scoped>
.claim-banner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 16px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-card);
  background: var(--mp-surface);
  color: var(--mp-ink);
}

.claim-banner__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.claim-banner__title {
  margin: 0;
  font-size: var(--mp-fs-body-lg);
  font-weight: var(--mp-fw-bold);
}

.claim-banner__text {
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body);
}

.claim-banner__action {
  grid-column: 1 / -1;
  justify-self: start;
  min-block-size: var(--mp-tap);
  padding-inline: 18px;
  border: 1px solid var(--mp-ink);
  border-radius: var(--mp-r-btn);
  background: var(--mp-surface);
  color: var(--mp-ink);
  font: inherit;
  font-weight: var(--mp-fw-bold);
  cursor: pointer;
}

.claim-banner__action:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}
</style>
