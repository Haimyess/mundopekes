<script setup lang="ts">
import SuggestionModal from '~/components/suggestions/SuggestionModal.vue'
import LanguageSelector from './LanguageSelector.vue'

const { t } = useI18n()
const { getNavCategoriesWithChildren } = useCategories()

const wizardOpen = ref(false)
const isMobileMenuOpen = ref(false)

type CategoryWithChildren = {
  id: string
  name: string
  slug: string
  icon: string | null
  children: { id: string; name: string; slug: string; icon: string | null }[]
}

const navCategories = ref<CategoryWithChildren[]>([])

onMounted(async () => {
  navCategories.value = await getNavCategoriesWithChildren()
})
</script>

<template>
  <nav class="navbar">
    <UContainer>
      <div class="navbar__inner">

        <NuxtLink to="/" class="navbar__logo">MundoPekes</NuxtLink>

        <!-- Desktop -->
        <div class="navbar__desktop">
          <UDropdownMenu
            v-for="cat in navCategories"
            :key="cat.slug"
            :items="cat.children.map(sub => ({
              label: sub.name,
              icon: sub.icon ?? undefined,
              to: `/search?category=${sub.slug}`
            }))"
          >
            <UButton
              variant="ghost"
              size="sm"
              :leading-icon="cat.icon ?? undefined"
              trailing-icon="i-heroicons-chevron-down"
              class="navbar__link"
            >
              {{ cat.name }}
            </UButton>
          </UDropdownMenu>

          <div class="navbar__divider" />

          <UButton
            size="sm"
            icon="i-heroicons-light-bulb"
            class="navbar__suggest"
            @click="wizardOpen = true"
          >
            {{ t('nav.suggest') }}
          </UButton>

          <div class="navbar__divider" />
          <LanguageSelector />
        </div>

        <!-- Mobile -->
        <div class="navbar__mobile-controls">
          <LanguageSelector />
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-align-justify"
            class="navbar__burger"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
          />
        </div>

      </div>
    </UContainer>

    <!-- <SuggestionModal v-model:open="showModal" @close="showModal = false" /> -->

    <SuggestionsSuggestionWizard v-model:open="wizardOpen" />

    <LayoutMobileMenu
      :is-open="isMobileMenuOpen"
      :nav-categories="navCategories"
      @suggest="wizardOpen = true"
      @close="isMobileMenuOpen = false"
    />
  </nav>
</template>

<style scoped>
.navbar {
  background-color: white;
}

.navbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  gap: 0.5rem;
}

.navbar__logo {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-secondary-700);
  text-decoration: none;
  letter-spacing: -0.02em;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
}
.navbar__logo:hover { opacity: 0.8; }

.navbar__desktop {
  display: none;
  align-items: center;
  gap: 0.25rem;
}

.navbar__link {
  color: var(--color-gray-800) !important;
  font-weight: 500;
  border-radius: 9999px;
}
.navbar__link:hover {
  background-color: var(--color-secondary-50) !important;
  color: var(--color-secondary-800) !important;
}

.navbar__suggest {
  background-color: var(--color-secondary-500);
  color: white;
  font-weight: 600;
  border-radius: 9999px;
  border: none;
}
.navbar__suggest:hover {
  background-color: var(--color-secondary-600);
}

.navbar__divider {
  width: 1px;
  height: 20px;
  background-color: var(--color-gray-200);
  margin: 0 0.25rem;
}

.navbar__mobile-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.navbar__burger {
  color: var(--color-secondary-700) !important;
}

@media (min-width: 768px) {
  .navbar__desktop { display: flex; }
  .navbar__mobile-controls { display: none; }
}
</style>