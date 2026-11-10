<script setup lang="ts">
interface Props {
  rows?: number
  maxlength?: number
  placeholder?: string
}

withDefaults(defineProps<Props>(), {
  rows: 4,
  maxlength: undefined,
  placeholder: undefined,
})

const modelValue = defineModel<string>({ default: '' })
</script>

<template>
  <UTextarea
    v-model="modelValue"
    :rows="rows"
    :maxlength="maxlength"
    :placeholder="placeholder"
    autoresize
    class="ui-textarea"
  />
</template>

<style scoped>
.ui-textarea {
  inline-size: 100%;
}
</style>
