<script setup lang="ts">
interface Props {
  message: string
}

defineProps<Props>()
</script>

<template>
  <div class="form-success" role="status">
    <UiIcon name="i-hugeicons-checkmark-circle-02" :size="40" />
    <p class="form-success__message">{{ message }}</p>
    <slot />
  </div>
</template>

<style scoped>
.form-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-block: 16px;
  color: var(--mp-green);
  text-align: center;
}

.form-success__message {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body);
}
</style>
