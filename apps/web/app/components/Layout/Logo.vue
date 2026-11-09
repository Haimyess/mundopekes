<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  size: 'md',
})
</script>

<template>
  <span class="layout-logo" :class="`layout-logo--${size}`">
    <span class="layout-logo__mark" aria-hidden="true">mp</span>
    <span class="layout-logo__name">MundoPekes</span>
  </span>
</template>

<style scoped>
.layout-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--mp-ink);
  font-family: var(--mp-font-logo);
}

.layout-logo__mark {
  display: grid;
  place-items: center;
  inline-size: 36px;
  block-size: 36px;
  border-radius: var(--mp-r-input);
  background: var(--mp-coral);
  color: var(--mp-surface);
  font-size: 15px;
  font-weight: var(--mp-fw-heavy);
  letter-spacing: -0.05em;
}

.layout-logo__name {
  font-size: 20px;
  font-weight: var(--mp-fw-heavy);
  letter-spacing: var(--mp-ls-h1);
}

@media (min-width: 1200px) {
  .layout-logo--md .layout-logo__mark {
    inline-size: var(--mp-tap);
    block-size: var(--mp-tap);
    font-size: 18px;
  }

  .layout-logo--md .layout-logo__name {
    font-size: 24px;
  }
}
</style>
