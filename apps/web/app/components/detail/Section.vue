<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()

const headingId = useId()
</script>

<template>
  <section class="detail-section" :aria-labelledby="headingId">
    <UiSectionHeader :title="title" :heading-id="headingId" />
    <slot />
  </section>
</template>

<style scoped>
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-block: 20px;
  border-block-start: 1px solid var(--mp-border-soft);
}
</style>
