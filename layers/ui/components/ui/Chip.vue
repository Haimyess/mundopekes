<script setup lang="ts">
export type ChipSize = 'sm' | 'md'

interface Props {
  selected?: boolean
  icon?: string
  count?: number
  size?: ChipSize
  as?: 'button' | 'span'
  to?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: undefined,
  icon: undefined,
  count: undefined,
  size: 'md',
  as: 'button',
  to: undefined,
  disabled: false,
})

const emit = defineEmits<{ toggle: [selected: boolean] }>()

const isInteractive = computed(() => props.as === 'button')
const isToggle = computed(() => isInteractive.value && props.selected !== undefined)

const elementAttributes = computed(() =>
  isInteractive.value
    ? {
        type: 'button',
        disabled: props.disabled,
        'aria-pressed': isToggle.value ? String(props.selected) : undefined,
      }
    : {}
)

const handleClick = () => {
  if (!isInteractive.value || props.disabled) return
  emit('toggle', !props.selected)
}
</script>

<template>
  <NuxtLink v-if="to" v-slot="{ href, navigate }" :to="to" custom>
    <a
      :href="href ?? undefined"
      class="ui-chip"
      :class="[`ui-chip--${size}`, { 'ui-chip--selected': selected }]"
      :aria-current="selected ? 'true' : undefined"
      @click="navigate"
    >
      <UiIcon v-if="icon" :name="icon" :size="16" />
      <span class="ui-chip__label"><slot /></span>
      <span v-if="count !== undefined" class="ui-chip__count" dir="ltr">{{ count }}</span>
    </a>
  </NuxtLink>
  <component
    :is="as"
    v-else
    class="ui-chip"
    :class="[
      `ui-chip--${size}`,
      { 'ui-chip--selected': selected, 'ui-chip--static': !isInteractive },
    ]"
    v-bind="elementAttributes"
    @click="handleClick"
  >
    <UiIcon v-if="icon" :name="icon" :size="16" />
    <span class="ui-chip__label"><slot /></span>
    <span v-if="count !== undefined" class="ui-chip__count" dir="ltr">{{ count }}</span>
  </component>
</template>

<style scoped>
.ui-chip {
  position: relative;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-block-size: 36px;
  padding-inline: 14px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
  background: var(--mp-surface);
  color: var(--mp-ink);
  font: inherit;
  font-family: var(--mp-font);
  font-size: var(--mp-fs-body);
  font-weight: var(--mp-fw-semibold);
  white-space: nowrap;
}

.ui-chip:not(.ui-chip--static) {
  cursor: pointer;
}

.ui-chip:not(.ui-chip--static)::before {
  content: '';
  position: absolute;
  inset-block: -4px;
  inset-inline: 0;
}

.ui-chip:not(.ui-chip--static):hover:not(:disabled) {
  border-color: var(--mp-ink);
}

.ui-chip:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

.ui-chip:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.ui-chip--sm {
  min-block-size: 30px;
  padding-inline: 10px;
  font-size: var(--mp-fs-body-sm);
}

.ui-chip--sm:not(.ui-chip--static)::before {
  inset-block: -7px;
}

.ui-chip--selected {
  border-color: var(--mp-ink);
  background: var(--mp-ink);
  color: var(--mp-surface);
}

.ui-chip__count {
  color: var(--mp-text-3);
  font-weight: var(--mp-fw-medium);
}

.ui-chip--selected .ui-chip__count {
  color: inherit;
}
</style>
