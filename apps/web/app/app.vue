<script setup lang="ts">
const { locale } = useI18n()

useHead({
  htmlAttrs: {
    dir: computed(() => (locale.value === 'he' ? 'rtl' : 'ltr')),
    lang: computed(() => locale.value),
  },
})
</script>

<template>
  <div>
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
