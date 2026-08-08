<script setup lang="ts">
import LanguageSelector from './LanguageSelector.vue'

const { t } = useI18n()
const { tc } = useI18nContent()
const { getNavCategoriesWithChildren } = useCategories()

const wizardOpen = ref(false)
const isMobileMenuOpen = ref(false)

type CategoryWithChildren = {
  id: string
  name_i18n: Record<string, string>
  slug: string
  icon: string | null
  children: { id: string; name_i18n: Record<string, string>; slug: string; icon: string | null }[]
}

const navCategories = ref<CategoryWithChildren[]>([])
const loading = ref(true)

onMounted(async () => {
  navCategories.value = await getNavCategoriesWithChildren()
  loading.value = false
})
</script>

<template>
  <nav class="navbar">
    <UContainer>
      <div class="navbar__inner">
        <NuxtLink to="/" class="navbar__logo">
          <NuxtImg
            src="/mundopekes_logo_nobg.png"
            alt="Mundo Pekes Logo"
            class="navbar__logo-img"
          />
        </NuxtLink>

        <!-- Desktop -->
        <div class="navbar__desktop">
          <!-- Skeleton -->
          <div v-if="loading" class="navbar__skeleton">
            <div v-for="n in 4" :key="n" class="navbar__skeleton-pill" />
          </div>

          <template v-else>
            <UDropdownMenu
              v-for="cat in navCategories"
              :key="cat.slug"
              :items="
                cat.children.map((sub) => ({
                  label: tc(sub.name_i18n),
                  to: `/search?category=${sub.slug}`,
                }))
              "
            >
              <UButton
                variant="ghost"
                size="sm"
                trailing-icon="i-heroicons-chevron-down"
                class="navbar__link"
              >
                {{ tc(cat.name_i18n) }}
              </UButton>
            </UDropdownMenu>
          </template>

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
            size="md"
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
.navbar__logo {
  display: flex;
  align-items: center;
}

.navbar__logo-img {
  /* Controla la altura máxima según tu diseño */
  height: 100px;
  width: auto;
  object-fit: contain;
  margin-top: 0.5rem;
  position: relative;
  left: -30px;
}

.navbar {
  background-color: white;
}

.navbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  gap: 0.5rem;
  margin-top: 1rem;
}

/* .navbar__logo {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--color-secondary-700);
  text-decoration: none;
  letter-spacing: -0.02em;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
} */
.navbar__logo:hover {
  opacity: 0.8;
}

.navbar__desktop {
  display: none;
  align-items: center;
  gap: 0.25rem;
}

.navbar__link {
  color: var(--color-gray-800) !important;
  font-weight: 500;
  border-radius: 9999px;
  cursor: pointer;
}
.navbar__link:hover {
  background-color: var(--color-secondary-50) !important;
  color: var(--color-secondary-800) !important;
}

.navbar__desktop :deep([role='menuitem']) {
  cursor: pointer;
}

.navbar__skeleton {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.navbar__skeleton-pill {
  height: 32px;
  width: 90px;
  background-color: var(--color-gray-200);
  border-radius: 9999px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
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
  .navbar__inner {
    height: 64px;
  }
  .navbar__desktop {
    display: flex;
  }
  .navbar__mobile-controls {
    display: none;
  }
}
</style>
