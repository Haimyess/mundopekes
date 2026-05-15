<script setup lang="ts">
const { t } = useI18n()
const { open: openContact } = useContactForm()

const currentYear = new Date().getFullYear()

const footerLinks = [
  { label: 'footer.about', to: '/about' },
  { label: 'footer.privacy', to: '/privacy' },
  { label: 'footer.terms', to: '/terms' },
  { label: 'provider.footer_link', to: '/become-provider' },
]
</script>

<template>
  <footer class="bg-gray-900 text-white py-8 mt-auto">
    <UiContainer>
      <div
        class="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:items-center md:text-left md:gap-0"
      >
        <!-- Logo -->
        <span class="text-xl font-bold text-primary-400">MundoPekes</span>

        <!-- Links -->
        <nav class="flex items-center flex-wrap justify-center gap-4 md:justify-start md:gap-6">
          <NuxtLink
            v-for="link in footerLinks"
            :key="link.to"
            :to="link.to"
            class="text-gray-300 hover:text-white transition-colors text-sm link"
          >
            {{ t(link.label) }}
          </NuxtLink>
          <button
            class="link text-gray-300 hover:text-white transition-colors text-sm"
            @click="openContact('other')"
          >
            {{ t('nav.contact') }}
          </button>
        </nav>

        <!-- Copyright -->
        <div class="text-gray-400 text-xs md:text-sm">
          © {{ currentYear }} MundoPekes. {{ t('footer.rights') }}
        </div>
      </div>
    </UiContainer>
  </footer>
</template>

<style scoped>
footer button {
  /* font-family: var(--font-family-base); */
  color: inherit;
}

.link {
  font-size: var(--font-size-sm);
}

.link::hover {
  text-decoration: underline wavy red 2px;
  cursor: pointer;
}
</style>
