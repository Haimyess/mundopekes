<script setup lang="ts">
import type { CategoryWithChildren } from '~/composables/useCategories'

const { t, locale } = useI18n()
const { tc } = useI18nContent()

const props = defineProps<{
  isOpen: boolean
  navCategories: CategoryWithChildren[]
}>()

const emit = defineEmits<{
  close: []
  suggest: []
}>()

// ── Computed ──────────────────────────────────────────────────────────────────

const slideoverSide = computed(() => (locale.value === 'he' ? 'right' : 'left'))

const isOpenModel = computed({
  get: () => props.isOpen,
  set: (val: boolean) => {
    if (!val) emit('close')
  },
})

// ── Acordeón ─────────────────────────────────────────────────────────────────

const categoriesOpen = ref(false)
const openCats = ref<string[]>([])

const toggleCat = (slug: string) => {
  const idx = openCats.value.indexOf(slug)
  if (idx === -1) openCats.value.push(slug)
  else openCats.value.splice(idx, 1)
}

const isCatOpen = (slug: string) => openCats.value.includes(slug)

// ── Handlers ─────────────────────────────────────────────────────────────────

const navigateAndClose = () => emit('close')

const handleSuggest = () => {
  emit('suggest')
  emit('close')
}

const { open: openContact } = useContactForm()

const openContactDrawer = () => {
  emit('close')
  openContact('other')
}
</script>

<template>
  <USlideover v-model:open="isOpenModel" :side="slideoverSide" :ui="{ content: 'w-72' }">
    <template #content>
      <div class="mobile-menu">
        <!-- Header -->
        <div class="mobile-menu__header">
          <NuxtLink to="/" class="mobile-menu__logo" @click="navigateAndClose">
            MundoPekes
          </NuxtLink>
          <UButton
            variant="ghost"
            icon="i-heroicons-x-mark"
            aria-label="Cerrar"
            @click="emit('close')"
          />
        </div>

        <!-- Nav -->
        <nav class="mobile-menu__nav">
          <!-- Inicio -->
          <NuxtLink
            to="/"
            class="mobile-menu__link"
            active-class="mobile-menu__link--active"
            @click="navigateAndClose"
          >
            <UIcon name="i-heroicons-home" class="mobile-menu__icon" />
            <span>{{ t('nav.home') }}</span>
          </NuxtLink>

          <!-- Categorías — acordeón principal -->
          <div class="mobile-menu__accordion">
            <button
              class="mobile-menu__accordion-trigger"
              @click="categoriesOpen = !categoriesOpen"
            >
              <div class="mobile-menu__accordion-trigger-left">
                <UIcon name="i-heroicons-squares-2x2" class="mobile-menu__icon" />
                <span>{{ t('nav.categories') }}</span>
              </div>
              <UIcon
                :name="categoriesOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                class="mobile-menu__chevron"
              />
            </button>

            <!-- Lista de categorías padre -->
            <div v-if="categoriesOpen" class="mobile-menu__accordion-body">
              <div v-for="cat in navCategories" :key="cat.slug" class="mobile-menu__cat-group">
                <!-- Categoría padre — toggle -->
                <button class="mobile-menu__cat-trigger" @click="toggleCat(cat.slug)">
                  <div class="mobile-menu__cat-trigger-left">
                    <UIcon v-if="cat.icon" :name="cat.icon" class="mobile-menu__icon" />
                    <span>{{ tc(cat.name_i18n) }}</span>
                  </div>
                  <UIcon
                    :name="
                      isCatOpen(cat.slug) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'
                    "
                    class="mobile-menu__chevron"
                  />
                </button>

                <!-- Subcategorías -->
                <div v-if="isCatOpen(cat.slug)" class="mobile-menu__sublist">
                  <NuxtLink
                    v-for="sub in cat.children"
                    :key="sub.slug"
                    :to="`/search?category=${sub.slug}`"
                    class="mobile-menu__sublink"
                    @click="navigateAndClose"
                  >
                    {{ tc(sub.name_i18n) }}
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>

          <!-- Sugerir actividad -->
          <button class="mobile-menu__link mobile-menu__link--button" @click="handleSuggest">
            <UIcon name="i-heroicons-light-bulb" class="mobile-menu__icon" />
            <span>{{ t('nav.suggest') }}</span>
          </button>

          <!-- Contacto -->
          <button class="mobile-menu__link mobile-menu__link--button" @click="openContactDrawer">
            <UIcon name="i-heroicons-envelope" class="mobile-menu__icon" />
            <span>{{ t('nav.contact') }}</span>
          </button>
        </nav>
      </div>
    </template>
  </USlideover>
</template>

<style scoped>
.mobile-menu {
  padding: 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.mobile-menu__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-menu__logo {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-secondary-700);
  text-decoration: none;
  letter-spacing: -0.02em;
}

.mobile-menu__nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mobile-menu__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-gray-700);
  text-decoration: none;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  text-align: start;
}
.mobile-menu__link:hover {
  background-color: var(--color-secondary-50);
  color: var(--color-secondary-700);
}
.mobile-menu__link--active {
  background-color: var(--color-secondary-50);
  color: var(--color-secondary-700);
}

.mobile-menu__accordion-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-gray-700);
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.mobile-menu__accordion-trigger:hover {
  background-color: var(--color-secondary-50);
}
.mobile-menu__accordion-trigger-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mobile-menu__chevron {
  width: 1rem;
  height: 1rem;
  color: var(--color-gray-400);
  flex-shrink: 0;
}

.mobile-menu__accordion-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.25rem 0 0.25rem 0.75rem;
}

.mobile-menu__cat-group {
  display: flex;
  flex-direction: column;
}

.mobile-menu__cat-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-gray-700);
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.mobile-menu__cat-trigger:hover {
  background-color: var(--color-secondary-50);
}
.mobile-menu__cat-trigger-left {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.mobile-menu__sublist {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.125rem 0 0.25rem 2.5rem;
}

.mobile-menu__sublink {
  display: block;
  padding: 0.375rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: var(--color-gray-500);
  text-decoration: none;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.mobile-menu__sublink:hover {
  background-color: var(--color-secondary-50);
  color: var(--color-secondary-700);
}

.mobile-menu__icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}
</style>
