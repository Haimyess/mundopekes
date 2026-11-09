<script setup lang="ts">
interface Props {
  title: string
  level?: 2 | 3 | 4
  headingId?: string
  subtitle?: string
  actionLabel?: string
  actionTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  level: 2,
  headingId: undefined,
  subtitle: undefined,
  actionLabel: undefined,
  actionTo: undefined,
})

const headingTag = computed(() => `h${props.level}`)
const hasAction = computed(() => !!props.actionLabel && !!props.actionTo)
</script>

<template>
  <div class="ui-section-header">
    <div class="ui-section-header__text">
      <component :is="headingTag" :id="headingId" class="ui-section-header__title">
        {{ title }}
      </component>
      <p v-if="subtitle" class="ui-section-header__subtitle">{{ subtitle }}</p>
    </div>
    <NuxtLink v-if="hasAction" :to="actionTo" class="ui-section-header__action">
      {{ actionLabel }}
      <UiIcon name="i-hugeicons-arrow-right-01" :size="16" mirror-in-rtl />
    </NuxtLink>
  </div>
</template>

<style scoped>
.ui-section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.ui-section-header__title {
  margin: 0;
  color: var(--mp-ink);
  font-family: var(--mp-font);
  font-size: var(--mp-fs-section-title);
  font-weight: var(--mp-fw-heavy);
  letter-spacing: var(--mp-ls-section-title);
  line-height: 1.15;
}

.ui-section-header__subtitle {
  margin: 4px 0 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body);
}

.ui-section-header__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-block-size: var(--mp-tap);
  color: var(--mp-ink);
  font-size: var(--mp-fs-body);
  font-weight: var(--mp-fw-semibold);
  text-decoration: underline;
  text-underline-offset: 3px;
  white-space: nowrap;
}

.ui-section-header__action:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}
</style>
