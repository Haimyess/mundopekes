<script setup lang="ts">
const { t } = useI18n()
const { isMobile } = useResponsive()
const { open: openContact } = useContactForm()

const currentYear = new Date().getFullYear()

const footerLinks = [
  { label: 'footer.about', to: '/about' },
  { label: 'footer.privacy', to: '/privacy' },
  { label: 'footer.terms', to: '/terms' },
]
</script>

<template>
  <footer class="bg-gray-900 text-white py-8 mt-auto">
    <UiContainer>
      <!-- Mobile Layout -->
      <div v-if="isMobile" class="flex flex-col items-center gap-6 text-center">
        <!-- Logo -->
        <span class="text-xl font-bold text-primary-400">MundoPekes</span>

        <!-- Links -->
        <nav class="flex flex-wrap justify-center gap-4">
          <NuxtLink
            v-for="link in footerLinks"
            :key="link.to"
            :to="link.to"
            class="text-gray-300 hover:text-white transition-colors text-sm"
          >
            {{ t(link.label) }}
          </NuxtLink>
          <button
            class="text-gray-300 hover:text-white transition-colors text-sm"
            @click="openContact('other')"
          >
            {{ t('nav.contact') }}
          </button>
        </nav>

        <!-- Copyright -->
        <div class="text-gray-400 text-xs">
          © {{ currentYear }} MundoPekes. {{ t('footer.rights') }}
        </div>
      </div>

      <!-- Desktop Layout -->
      <div v-else class="flex justify-between items-center">
        <!-- Logo -->
        <span class="text-xl font-bold text-primary-400">MundoPekes</span>

        <!-- Links -->
        <nav class="flex gap-6">
          <NuxtLink
            v-for="link in footerLinks"
            :key="link.to"
            :to="link.to"
            class="text-gray-300 hover:text-white transition-colors"
          >
            {{ t(link.label) }}
          </NuxtLink>
          <button
            class="text-gray-300 hover:text-white transition-colors"
            @click="openContact('other')"
          >
            {{ t('nav.contact') }}
          </button>
        </nav>

        <!-- Copyright -->
        <div class="text-gray-400 text-sm">
          © {{ currentYear }} MundoPekes. {{ t('footer.rights') }}
        </div>
      </div>
    </UiContainer>
  </footer>
</template>

<style scoped></style>
