<script setup lang="ts">
interface Props {
  title: string
  closeLabel: string
  description?: string
  isDismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  description: undefined,
  isDismissible: true,
})

const open = defineModel<boolean>('open', { default: false })

const isDesktop = useHydrationSafeMediaQuery('(min-width: 1200px)')
const POPOVER_CONTENT = {
  side: 'bottom',
  align: 'start',
  sideOffset: 8,
  collisionPadding: 16,
} as const

const drawerCloseButton = ref<HTMLButtonElement | null>(null)
let focusReturnTarget: HTMLElement | null = null

function focusAfterRender(target: () => HTMLElement | null | undefined) {
  void nextTick(() => requestAnimationFrame(() => target()?.focus()))
}

watch(open, (isOpen) => {
  if (isDesktop.value) return
  if (isOpen) {
    focusReturnTarget =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    focusAfterRender(() => drawerCloseButton.value)
    return
  }
  const target = focusReturnTarget
  focusReturnTarget = null
  focusAfterRender(() => (target?.isConnected ? target : null))
})

const drawerUi = {
  overlay: 'ui-sheet__overlay',
  content: 'ui-sheet ui-sheet--drawer',
  handle: 'ui-sheet__handle',
  container: 'ui-sheet__container',
  header: 'ui-sheet__header',
  title: 'ui-sheet__title',
  description: 'ui-sheet__description',
  body: 'ui-sheet__body',
  footer: 'ui-sheet__footer',
}

const handleClose = () => {
  open.value = false
}
</script>

<template>
  <UPopover
    v-if="isDesktop"
    v-model:open="open"
    :modal="true"
    :dismissible="props.isDismissible"
    :content="POPOVER_CONTENT"
    :ui="{ content: 'ui-sheet ui-sheet--popover' }"
  >
    <slot name="trigger" />
    <template #content>
      <div class="ui-sheet__header">
        <div class="ui-sheet__heading">
          <h2 class="ui-sheet__title">{{ title }}</h2>
          <p v-if="description" class="ui-sheet__description">{{ description }}</p>
        </div>
        <button type="button" class="ui-sheet__close" :aria-label="closeLabel" @click="handleClose">
          <UiIcon name="i-hugeicons-cancel-01" :size="20" />
        </button>
      </div>
      <div class="ui-sheet__body">
        <slot />
      </div>
      <div v-if="$slots.footer" class="ui-sheet__footer">
        <slot name="footer" />
      </div>
    </template>
  </UPopover>
  <UDrawer
    v-else
    v-model:open="open"
    direction="bottom"
    :title="title"
    :description="description"
    :dismissible="props.isDismissible"
    :ui="drawerUi"
  >
    <slot name="trigger" />
    <template #close>
      <button
        ref="drawerCloseButton"
        type="button"
        class="ui-sheet__close"
        :aria-label="closeLabel"
      >
        <UiIcon name="i-hugeicons-cancel-01" :size="20" />
      </button>
    </template>
    <template #body>
      <slot />
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UDrawer>
</template>

<style>
.ui-sheet {
  color: var(--mp-ink);
  font-family: var(--mp-font);
  background: var(--mp-surface);
  box-shadow: none;
}

.ui-sheet--drawer {
  max-block-size: 90dvh;
  border-start-start-radius: var(--mp-r-sheet);
  border-start-end-radius: var(--mp-r-sheet);
}

.ui-sheet--popover {
  inline-size: min(420px, calc(100vw - 2 * var(--mp-gutter)));
  max-block-size: min(640px, calc(100dvh - 2 * var(--mp-gutter)));
  overflow-y: auto;
  padding: 20px;
  border: 1px solid var(--mp-border-soft);
  border-radius: var(--mp-r-sheet);
  box-shadow: 0 16px 40px rgb(17 17 17 / 14%);
}

.ui-sheet__overlay {
  background: rgb(17 17 17 / 40%);
}

.ui-sheet__handle {
  background: var(--mp-border);
}

.ui-sheet__container {
  gap: 16px;
  padding: 16px var(--mp-gutter) calc(16px + env(safe-area-inset-bottom));
}

.ui-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.ui-sheet--popover .ui-sheet__header {
  margin-block-end: 16px;
}

.ui-sheet__title {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-card-title);
  font-weight: var(--mp-fw-heavy);
  letter-spacing: var(--mp-ls-card-title);
}

.ui-sheet__description {
  margin: 4px 0 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body);
}

.ui-sheet__close {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  inline-size: var(--mp-tap);
  block-size: var(--mp-tap);
  margin-block: -8px;
  margin-inline-end: -8px;
  border: 0;
  border-radius: var(--mp-r-pill);
  background: transparent;
  color: var(--mp-ink);
  cursor: pointer;
}

.ui-sheet__close:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

.ui-sheet__footer {
  display: flex;
  gap: 12px;
  padding-block-start: 12px;
  border-block-start: 1px solid var(--mp-border-soft);
}

.ui-sheet--popover .ui-sheet__footer {
  margin-block-start: 16px;
}
</style>
