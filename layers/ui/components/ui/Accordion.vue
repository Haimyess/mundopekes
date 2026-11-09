<script setup lang="ts" generic="T extends { label: string; value: string }">
interface Props {
  items: T[]
  isMultiple?: boolean
}

withDefaults(defineProps<Props>(), {
  isMultiple: true,
})

defineSlots<{ panel(props: { item: T }): unknown }>()
</script>

<template>
  <UAccordion
    :items="items"
    :type="isMultiple ? 'multiple' : 'single'"
    trailing-icon="i-hugeicons-arrow-down-01"
    :ui="{
      root: 'ui-accordion',
      item: 'ui-accordion__item',
      trigger: 'ui-accordion__trigger',
      label: 'ui-accordion__label',
      trailingIcon: 'ui-accordion__icon',
      body: 'ui-accordion__body',
    }"
  >
    <template #body="{ item }">
      <slot name="panel" :item="item as T" />
    </template>
  </UAccordion>
</template>

<style>
.ui-accordion {
  font-family: var(--mp-font);
}

.ui-accordion__item {
  border-block-end: 1px solid var(--mp-border-soft);
}

.ui-accordion__trigger {
  min-block-size: var(--mp-tap);
  color: var(--mp-ink);
  font-size: var(--mp-fs-body-lg);
  font-weight: var(--mp-fw-semibold);
}

.ui-accordion__trigger:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: -3px;
}

.ui-accordion__icon {
  inline-size: 20px;
  block-size: 20px;
}

.ui-accordion__body {
  padding-block-end: 16px;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body);
}
</style>
