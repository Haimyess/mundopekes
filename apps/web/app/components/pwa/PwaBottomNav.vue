<script setup lang="ts">
/**
 * Bottom tab bar de la PWA instalada — pill flotante con 5 accesos:
 * Home y Buscar son navegación real (rutas ya existentes); Categorías,
 * Sugerir Actividad y Contacto son las 3 acciones que vivían en el
 * Navbar/hamburguesa de mobile web y se perdían al sacar el Navbar en
 * layouts/pwa.vue. Reutiliza useCategories, SuggestionsSuggestionWizard y
 * useContactForm tal cual existen, no se duplica nada de esa lógica.
 *
 * Import explícito (no auto-import): useRoute vía Nuxt auto-import no es
 * mockeable con la infra de test actual (requiere contexto Nuxt real, ver
 * memory project_test_infra — mismo problema documentado para
 * useRuntimeConfig). Con el import explícito, vi.mock('nuxt/app', ...) sí
 * lo intercepta (ver PwaBottomNav.test.ts).
 */
import { useRoute } from 'nuxt/app'

interface NavCategory {
  id: string
  name_i18n: Record<string, string>
  slug: string
  icon: string | null
  children: { id: string; name_i18n: Record<string, string>; slug: string; icon: string | null }[]
}

const route = useRoute()
const { t } = useI18n()
const { tc } = useI18nContent()
const { getNavCategoriesWithChildren } = useCategories()
const { open: openContact } = useContactForm()

const isHomeActive = computed(() => route.path === '/')
const isExploreActive = computed(() => route.path.startsWith('/search'))

const categoriesOpen = ref(false)
const loadingCategories = ref(false)
const navCategories = ref<NavCategory[]>([])

async function openCategories() {
  categoriesOpen.value = true
  if (navCategories.value.length) return
  loadingCategories.value = true
  navCategories.value = await getNavCategoriesWithChildren()
  loadingCategories.value = false
}

// Acordeón de subcategorías — mismo patrón que LayoutMobileMenu.vue
// (toggleCat/isCatOpen), la versión mobile-web de esto mismo.
const openCats = ref<string[]>([])

function toggleCat(slug: string) {
  const idx = openCats.value.indexOf(slug)
  if (idx === -1) openCats.value.push(slug)
  else openCats.value.splice(idx, 1)
}

function isCatOpen(slug: string) {
  return openCats.value.includes(slug)
}

const wizardOpen = ref(false)
</script>

<template>
  <nav class="pwa-bottom-nav" aria-label="Navegación principal">
    <NuxtLink
      to="/"
      class="pwa-bottom-nav__item"
      :class="{ 'pwa-bottom-nav__item--active': isHomeActive }"
      :aria-label="t('nav.home')"
    >
      <UIcon name="i-heroicons-home" class="pwa-bottom-nav__icon" />
    </NuxtLink>

    <NuxtLink
      to="/search"
      class="pwa-bottom-nav__item"
      :class="{ 'pwa-bottom-nav__item--active': isExploreActive }"
      :aria-label="t('nav.search')"
    >
      <UIcon name="i-heroicons-magnifying-glass" class="pwa-bottom-nav__icon" />
    </NuxtLink>

    <button
      type="button"
      class="pwa-bottom-nav__item"
      :aria-label="t('nav.categories')"
      @click="openCategories"
    >
      <UIcon name="i-heroicons-squares-2x2" class="pwa-bottom-nav__icon" />
    </button>

    <button
      type="button"
      class="pwa-bottom-nav__item"
      :aria-label="t('nav.suggest')"
      @click="wizardOpen = true"
    >
      <UIcon name="i-heroicons-light-bulb" class="pwa-bottom-nav__icon" />
    </button>

    <button
      type="button"
      class="pwa-bottom-nav__item"
      :aria-label="t('nav.contact')"
      @click="openContact()"
    >
      <UIcon name="i-heroicons-envelope" class="pwa-bottom-nav__icon" />
    </button>

    <UiDrawer v-model:open="categoriesOpen" :title="t('nav.categories')" max-height="70vh">
      <template #body>
        <div class="pwa-categories-sheet">
          <div v-if="loadingCategories" class="pwa-categories-sheet__loading">
            <UIcon name="i-heroicons-arrow-path" class="pwa-categories-sheet__loading-icon" />
          </div>

          <div v-for="cat in navCategories" :key="cat.slug" class="pwa-categories-sheet__group">
            <button class="pwa-categories-sheet__trigger" @click="toggleCat(cat.slug)">
              <div class="pwa-categories-sheet__trigger-left">
                <UIcon v-if="cat.icon" :name="cat.icon" class="pwa-categories-sheet__icon" />
                <span>{{ tc(cat.name_i18n) }}</span>
              </div>
              <UIcon
                :name="isCatOpen(cat.slug) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                class="pwa-categories-sheet__chevron"
              />
            </button>

            <div v-if="isCatOpen(cat.slug)" class="pwa-categories-sheet__sublist">
              <NuxtLink
                v-for="sub in cat.children"
                :key="sub.slug"
                :to="`/search?category=${sub.slug}`"
                class="pwa-categories-sheet__sublink"
                @click="categoriesOpen = false"
              >
                {{ tc(sub.name_i18n) }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </template>
    </UiDrawer>

    <SuggestionsSuggestionWizard v-model:open="wizardOpen" />
  </nav>
</template>

<style scoped>
/* Pill flotante compacta — centrada y del ancho justo para sus 5 íconos
   (no estirada de punta a punta), para que queden juntos como en la
   referencia, en vez de repartidos en todo el ancho de pantalla. */
.pwa-bottom-nav {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: var(--pwa-bottom-nav-offset);
  height: 52px;
  display: flex;
  align-items: stretch;
  padding-inline: var(--space-1);
  background: var(--color-bg-primary);
  border-radius: var(--border-radius-full);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-index-bottom-nav);
}

.pwa-bottom-nav__item {
  flex: 0 0 auto;
  width: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  text-decoration: none;
  cursor: pointer;
  /* Touch target cómodo (>=44px) sin depender solo de la altura de la barra */
  min-height: 44px;
  transition:
    transform 0.15s ease,
    color var(--transition-fast);
}

.pwa-bottom-nav__item:active {
  transform: scale(0.86);
}

.pwa-bottom-nav__item--active {
  color: var(--color-accent-700);
}

.pwa-bottom-nav__icon {
  width: 1.375rem;
  height: 1.375rem;
}

.pwa-categories-sheet {
  display: flex;
  flex-direction: column;
  padding: var(--space-2) var(--space-4) var(--space-4);
  overflow-y: auto;
}

.pwa-categories-sheet__group {
  display: flex;
  flex-direction: column;
}

.pwa-categories-sheet__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-3) var(--space-2);
  border: none;
  background: none;
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  border-radius: var(--border-radius-md);
  cursor: pointer;
}

.pwa-categories-sheet__trigger:hover {
  background: var(--color-neutral-50);
}

.pwa-categories-sheet__trigger-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.pwa-categories-sheet__icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

.pwa-categories-sheet__chevron {
  width: 1rem;
  height: 1rem;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.pwa-categories-sheet__sublist {
  display: flex;
  flex-direction: column;
  padding-inline-start: var(--space-8);
  padding-bottom: var(--space-1);
}

.pwa-categories-sheet__sublink {
  padding: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-decoration: none;
  border-radius: var(--border-radius-md);
}

.pwa-categories-sheet__sublink:hover {
  background: var(--color-neutral-50);
  color: var(--color-accent-700);
}

.pwa-categories-sheet__loading {
  display: flex;
  justify-content: center;
  padding: var(--space-6);
}

.pwa-categories-sheet__loading-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--color-accent-600);
  animation: pwa-categories-spin 0.8s linear infinite;
}

@keyframes pwa-categories-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
