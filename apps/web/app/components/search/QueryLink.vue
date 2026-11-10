<script setup lang="ts">
interface Props {
  to: string
}

defineOptions({ inheritAttrs: false })
defineProps<Props>()
</script>

<template>
  <NuxtLink v-slot="{ href, navigate }" :to="to" custom>
    <a v-bind="$attrs" :href="href ?? undefined" @click="navigate"><slot /></a>
  </NuxtLink>
</template>
