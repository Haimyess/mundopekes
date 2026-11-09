<script setup lang="ts">
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  type?: 'button' | 'submit' | 'reset'
  to?: string
  loading?: boolean
  disabled?: boolean
  block?: boolean
  icon?: string
  iconRight?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  to: undefined,
  loading: false,
  disabled: false,
  block: false,
  icon: undefined,
  iconRight: undefined,
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const isInactive = computed(() => props.disabled || props.loading)
const isLink = computed(() => !!props.to && !isInactive.value)

const variantClasses = computed(() => [
  `ui-button--${props.variant}`,
  `ui-button--${props.size}`,
  { 'ui-button--block': props.block, 'ui-button--loading': props.loading },
])

const handleClick = (event: MouseEvent) => {
  if (isInactive.value) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <NuxtLink v-if="isLink" :to="to!" class="ui-button" :class="variantClasses" @click="handleClick">
    <UiIcon v-if="icon" :name="icon" :size="20" />
    <span class="ui-button__label"><slot /></span>
    <UiIcon v-if="iconRight" :name="iconRight" :size="20" />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="isInactive"
    class="ui-button"
    :class="variantClasses"
    :aria-busy="loading || undefined"
    @click="handleClick"
  >
    <span v-if="loading" class="ui-button__spinner" aria-hidden="true" />
    <UiIcon v-else-if="icon" :name="icon" :size="20" />
    <span class="ui-button__label"><slot /></span>
    <UiIcon v-if="iconRight && !loading" :name="iconRight" :size="20" />
  </button>
</template>

<style scoped>
.ui-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-block-size: var(--mp-tap);
  padding-inline: 18px;
  border: 1px solid transparent;
  border-radius: var(--mp-r-btn);
  font: inherit;
  font-family: var(--mp-font);
  font-size: var(--mp-fs-body-lg);
  font-weight: var(--mp-fw-bold);
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
}

.ui-button:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

.ui-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.ui-button--primary {
  background: var(--mp-ink);
  color: var(--mp-surface);
}

.ui-button--primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--mp-ink) 82%, white);
}

.ui-button--secondary {
  background: var(--mp-surface);
  border-color: var(--mp-border);
  color: var(--mp-ink);
}

.ui-button--secondary:hover:not(:disabled) {
  border-color: var(--mp-ink);
}

.ui-button--ghost {
  background: transparent;
  color: var(--mp-ink);
}

.ui-button--ghost:hover:not(:disabled) {
  background: var(--mp-skeleton);
}

.ui-button--link {
  padding-inline: 0;
  background: transparent;
  color: var(--mp-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.ui-button--sm {
  min-block-size: 36px;
  padding-inline: 14px;
  font-size: var(--mp-fs-body);
}

.ui-button--sm::before {
  content: '';
  position: absolute;
  inset-block: -4px;
  inset-inline: 0;
}

.ui-button--lg {
  min-block-size: 52px;
  padding-inline: 22px;
}

.ui-button--block {
  inline-size: 100%;
}

.ui-button__spinner {
  inline-size: 16px;
  block-size: 16px;
  border: 2px solid currentColor;
  border-inline-end-color: transparent;
  border-radius: var(--mp-r-pill);
  animation: ui-button-spin 700ms linear infinite;
}

@keyframes ui-button-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ui-button__spinner {
    animation: none;
  }
}
</style>
