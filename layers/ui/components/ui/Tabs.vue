<script setup lang="ts" generic="T extends { label: string; value: string }">
interface Props {
  items: T[]
  label: string
}

const props = defineProps<Props>()

defineSlots<{ panel(props: { item: T }): unknown }>()

const modelValue = defineModel<string>({ required: true })

const tabsRoot = ref<{ $el: HTMLElement } | null>(null)

const labelTabList = () => {
  tabsRoot.value?.$el?.querySelector('[role="tablist"]')?.setAttribute('aria-label', props.label)
}

onMounted(labelTabList)
watch(() => props.label, labelTabList)
</script>

<template>
  <UTabs
    ref="tabsRoot"
    v-model="modelValue"
    :items="items"
    value-key="value"
    variant="link"
    :ui="{
      root: 'ui-tabs',
      list: 'ui-tabs__list',
      indicator: 'ui-tabs__indicator',
      trigger: 'ui-tabs__trigger',
      content: 'ui-tabs__panel',
    }"
  >
    <template #content="{ item }">
      <slot name="panel" :item="item as T" />
    </template>
  </UTabs>
</template>

<style>
.ui-tabs {
  gap: 16px;
  font-family: var(--mp-font);
}

.ui-tabs__list {
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  border-block-end: 1px solid var(--mp-border-soft);
}

.ui-tabs__trigger {
  min-block-size: var(--mp-tap);
  padding-inline: 12px;
  color: var(--mp-text-3);
  font-size: var(--mp-fs-body);
  font-weight: var(--mp-fw-semibold);
  white-space: nowrap;
}

.ui-tabs__trigger[data-state='active'] {
  color: var(--mp-ink);
  font-weight: var(--mp-fw-bold);
}

.ui-tabs__trigger:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: -3px;
}

.ui-tabs__indicator {
  background: var(--mp-ink);
}
</style>
