<script setup lang="ts">
import type { SeasonValue } from '~/types'

const { t } = useI18n()
const { tc } = useI18nContent()
const router = useRouter()

const { ageOptions, cityOptions, seasonOptions, buildQueryFromFilters } = useActivityFilters()
const { trackSearch } = useTracking()
const { getNavCategories } = useCategories()

// ── Estado ────────────────────────────────────────────────────────
const searchText = ref('')
const selectedAge = ref<number | undefined>(undefined)
const selectedCities = ref<string[]>([])
const selectedSeason = ref<SeasonValue | undefined>(undefined)
const isFree = ref(false)
const selectedCategory = ref<string | undefined>(undefined)
const rawCategoryOptions = ref<{ name_i18n: Record<string, string>; value: string }[]>([])
const categoryOptions = computed(() =>
  rawCategoryOptions.value.map((c) => ({ label: tc(c.name_i18n), value: c.value }))
)

// ── Drawers mobile ────────────────────────────────────────────────
const ageDrawerOpen = ref(false)
const cityDrawerOpen = ref(false)
const seasonDrawerOpen = ref(false)
const categoryDrawerOpen = ref(false)

onMounted(async () => {
  const cats = await getNavCategories()
  rawCategoryOptions.value = cats.map((c) => ({ name_i18n: c.name_i18n, value: c.slug }))
})

// ── Labels mobile — textos cortos para los pills ──────────────────
const getAgeShortLabel = (minMonths: number): string => {
  if (minMonths === 0) return '0-12m'
  if (minMonths === 12) return '1-3a'
  if (minMonths === 36) return '3-6a'
  if (minMonths === 72) return '6-12a'
  if (minMonths === 144) return '12+'
  return 'Todas'
}
// Label mobile:
const categoryLabelMobile = computed(() => {
  if (!selectedCategory.value) return t('search.category')
  return (
    categoryOptions.value.find((o) => o.value === selectedCategory.value)?.label ??
    t('search.category')
  )
})

const ageLabelMobile = computed(() => {
  if (selectedAge.value === undefined) return t('search.age')
  const opt = ageOptions.value.find((o) => o.value === selectedAge.value)
  if (!opt) return t('search.age')
  return getAgeShortLabel(opt.min)
})

const cityLabelMobile = computed(() => {
  if (!selectedCities.value.length) return t('search.city')
  if (selectedCities.value.length === 1) return selectedCities.value[0]
  return `${selectedCities.value.length} ${t('search.cities_selected')}`
})

const seasonLabelMobile = computed(() => {
  if (!selectedSeason.value) return t('search.season')
  return (
    seasonOptions.value.find((o) => o.value === selectedSeason.value)?.label ?? t('search.season')
  )
})

// ── Toggle helpers ────────────────────────────────────────────────
function makeSelect<T>(toggle: (val: T) => void, drawer: Ref<boolean>) {
  return (val: T) => {
    toggle(val)
    drawer.value = false
  }
}

const toggleAge = (id: number) => {
  selectedAge.value = selectedAge.value === id ? undefined : id
}

const toggleCity = (city: string) => {
  const idx = selectedCities.value.indexOf(city)
  if (idx === -1) selectedCities.value.push(city)
  else selectedCities.value.splice(idx, 1)
}

const toggleSeason = (val: SeasonValue) => {
  selectedSeason.value = selectedSeason.value === val ? undefined : val
}

const toggleCategory = (val: string) => {
  selectedCategory.value = selectedCategory.value === val ? undefined : val
}

const isCitySelected = (city: string) => selectedCities.value.includes(city)

const selectAge = makeSelect(toggleAge, ageDrawerOpen)
const selectSeason = makeSelect(toggleSeason, seasonDrawerOpen)
const selectCategory = makeSelect(toggleCategory, categoryDrawerOpen)

// ── Submit ────────────────────────────────────────────────────────
const handleSearch = () => {
  const ageOption = ageOptions.value.find((o) => o.value === selectedAge.value)
  const query = buildQueryFromFilters(
    {
      search: searchText.value || undefined,
      age_id: ageOption?.value,
      age_min: ageOption?.min,
      age_max: ageOption?.max,
      city: selectedCities.value.length ? selectedCities.value.join(',') : undefined,
      season: selectedSeason.value as any,
      is_free: isFree.value || undefined,
      category: selectedCategory.value,
    },
    searchText.value || undefined
  )
  trackSearch({
    query: searchText.value || undefined,
    category: selectedCategory.value,
    city: selectedCities.value.length ? selectedCities.value.join(',') : undefined,
    ageRange: ageOptions.value.find((o) => o.value === selectedAge.value)?.value?.toString(),
  })
  void router.push({ path: '/search', query })
}

// ── Íconos temporada (solo drawer) ───────────────────────────────
const seasonIcons: Record<string, string> = {
  spring: 'i-heroicons-sun',
  summer: 'i-heroicons-fire',
  fall: 'i-heroicons-cloud',
  winter: 'i-heroicons-snowflake',
}

// ── Placeholder dinámico (estilo Fever) ───────────────────────────
// El prefijo ("Encuentra") queda fijo; solo la actividad rota cada
// pocos segundos. Se usa t() con la ruta indexada — tm() devuelve el
// nodo de mensaje compilado (no un string) y se veía como JSON crudo.
const PLACEHOLDER_EXAMPLES_COUNT = 6
const rotatingIndex = ref(0)
const rotatingExample = computed(() => t(`hero.search_placeholder_examples.${rotatingIndex.value}`))
const showRotatingPlaceholder = computed(() => !searchText.value)
let rotatingTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  rotatingTimer = setInterval(() => {
    rotatingIndex.value = (rotatingIndex.value + 1) % PLACEHOLDER_EXAMPLES_COUNT
  }, 2800)
})
onBeforeUnmount(() => {
  if (rotatingTimer) clearInterval(rotatingTimer)
})

// ── Scroll hints de los pills mobile ──────────────────────────────
// Muestra una flecha animada en el borde que aún tiene contenido
// para indicar que se puede hacer scroll horizontal.
const pillsScrollEl = ref<HTMLElement | null>(null)
const canScrollPillsRight = ref(false)
const canScrollPillsLeft = ref(false)

function updatePillsScrollHints() {
  const el = pillsScrollEl.value
  if (!el) return
  const maxScroll = el.scrollWidth - el.clientWidth
  if (maxScroll <= 4) {
    canScrollPillsRight.value = false
    canScrollPillsLeft.value = false
    return
  }
  canScrollPillsLeft.value = el.scrollLeft > 4
  canScrollPillsRight.value = el.scrollLeft < maxScroll - 4
}

onMounted(() => {
  nextTick(updatePillsScrollHints)
  window.addEventListener('resize', updatePillsScrollHints)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePillsScrollHints)
})
</script>

<template>
  <div class="sf-card">
    <form @submit.prevent="handleSearch">
      <!-- ── MOBILE wrapper — oculto en desktop ──────────────────── -->
      <div class="sf-mobile-wrapper">
        <!-- Input bordeado — ícono y texto en la misma fila -->
        <div class="sf-search-row sf-search-row--bordered">
          <UIcon name="i-heroicons-magnifying-glass" class="sf-search-icon" />
          <div class="sf-search-input-wrap">
            <input
              v-model="searchText"
              class="sf-search-input"
              :aria-label="t('hero.search_placeholder')"
              type="text"
            />
            <div v-if="showRotatingPlaceholder" class="sf-rotating-placeholder">
              <span class="sf-rotating-placeholder__prefix">
                {{ t('hero.search_placeholder_prefix') }}
              </span>
              <Transition name="sf-rotate" mode="out-in">
                <span :key="rotatingIndex" class="sf-rotating-placeholder__word">
                  {{ rotatingExample }}
                </span>
              </Transition>
            </div>
          </div>
        </div>

        <!-- Pills con scroll horizontal -->
        <div class="sf-mobile-pills-wrap">
          <div ref="pillsScrollEl" class="sf-mobile-pills" @scroll="updatePillsScrollHints">
            <button
              type="button"
              class="sf-pill"
              :class="{ 'sf-pill--active': selectedCategory !== undefined }"
              @click="categoryDrawerOpen = true"
            >
              <UIcon name="i-heroicons-squares-2x2" class="sf-pill-icon" />
              {{ categoryLabelMobile }}
              <UIcon name="i-heroicons-chevron-down" class="sf-pill-x" />
            </button>
            <button
              type="button"
              class="sf-pill"
              :class="{ 'sf-pill--active': selectedAge !== undefined }"
              @click="ageDrawerOpen = true"
            >
              <UIcon name="i-heroicons-user" class="sf-pill-icon" />
              {{ ageLabelMobile }}
              <UIcon name="i-heroicons-chevron-down" class="sf-pill-x" />
            </button>

            <button
              type="button"
              class="sf-pill"
              :class="{ 'sf-pill--active': selectedCities.length > 0 }"
              @click="cityDrawerOpen = true"
            >
              <UIcon name="i-heroicons-map-pin" class="sf-pill-icon" />
              {{ cityLabelMobile }}
              <UIcon name="i-heroicons-chevron-down" class="sf-pill-x" />
            </button>

            <button
              type="button"
              class="sf-pill"
              :class="{ 'sf-pill--active': selectedSeason }"
              @click="seasonDrawerOpen = true"
            >
              <UIcon name="i-heroicons-calendar" class="sf-pill-icon" />
              {{ seasonLabelMobile }}
              <UIcon name="i-heroicons-chevron-down" class="sf-pill-x" />
            </button>

            <button
              type="button"
              class="sf-pill"
              :class="{ 'sf-pill--active': isFree }"
              @click="isFree = !isFree"
            >
              <UIcon name="i-heroicons-tag" class="sf-pill-icon" />
              {{ t('search.free') }}
            </button>
          </div>

          <!-- Flechas indicadoras de scroll horizontal -->
          <div
            v-if="canScrollPillsRight"
            class="sf-scroll-hint sf-scroll-hint--right"
            aria-hidden="true"
          >
            <UIcon name="i-heroicons-chevron-right" class="sf-scroll-hint__icon" />
          </div>
          <div
            v-if="canScrollPillsLeft"
            class="sf-scroll-hint sf-scroll-hint--left"
            aria-hidden="true"
          >
            <UIcon name="i-heroicons-chevron-left" class="sf-scroll-hint__icon" />
          </div>
        </div>

        <!-- Botón buscar mobile — full width -->
        <button type="submit" class="sf-btn-search sf-btn-search--mobile sf-btn-search--shine">
          <span class="sf-btn-search__content">
            <UIcon name="i-heroicons-magnifying-glass" class="sf-btn-icon" />
            {{ t('search.search_button') }}
          </span>
        </button>
      </div>

      <!-- ── DESKTOP — oculto en mobile ──────────────────────────── -->
      <div class="sf-desktop">
        <!-- Input bordeado desktop -->
        <div class="sf-search-row sf-search-row--bordered">
          <UIcon name="i-heroicons-magnifying-glass" class="sf-search-icon" />
          <div class="sf-search-input-wrap">
            <input
              v-model="searchText"
              class="sf-search-input"
              :aria-label="t('hero.search_placeholder')"
              type="text"
            />
            <div v-if="showRotatingPlaceholder" class="sf-rotating-placeholder">
              <span class="sf-rotating-placeholder__prefix">
                {{ t('hero.search_placeholder_prefix') }}
              </span>
              <Transition name="sf-rotate" mode="out-in">
                <span :key="rotatingIndex" class="sf-rotating-placeholder__word">
                  {{ rotatingExample }}
                </span>
              </Transition>
            </div>
          </div>
        </div>

        <!-- Selects en grid -->
        <div class="sf-desktop-filters">
          <UiSelect
            v-model="selectedCategory"
            :options="categoryOptions"
            :placeholder="t('search.category')"
          />
          <UiSelect v-model="selectedAge" :options="ageOptions" :placeholder="t('search.age')" />
          <USelect
            v-model="selectedCities"
            :items="cityOptions"
            :placeholder="t('search.city')"
            multiple
          />
          <UiSelect
            v-model="selectedSeason"
            :options="seasonOptions"
            :placeholder="t('search.season')"
          />
          <div class="sf-select-wrap--checkbox">
            <label class="sf-free-label">
              <div
                class="sf-checkbox"
                :class="{ 'sf-checkbox--checked': isFree }"
                @click="isFree = !isFree"
              >
                <UIcon v-if="isFree" name="i-heroicons-check" class="sf-checkbox-icon" />
              </div>
              <span>{{ t('search.free') }}</span>
            </label>
          </div>
        </div>

        <!-- Botón buscar desktop — 50% centrado -->
        <button type="submit" class="sf-btn-search sf-btn-search--desktop sf-btn-search--shine">
          <span class="sf-btn-search__content">
            <UIcon name="i-heroicons-magnifying-glass" class="sf-btn-icon" />
            {{ t('search.search_button') }}
          </span>
        </button>
      </div>
    </form>
  </div>

  <!-- ── Drawer: Edad ───────────────────────────────────────────── -->
  <!-- Radio: seleccionar cierra inmediatamente, sin botón Aplicar -->
  <UDrawer v-model:open="ageDrawerOpen" direction="bottom">
    <template #content>
      <div class="drawer">
        <h3 class="drawer__title">{{ t('search.age') }}</h3>
        <div class="drawer__options">
          <button
            v-for="opt in ageOptions"
            :key="opt.value"
            type="button"
            class="drawer__option"
            @click="selectAge(opt.value)"
          >
            <div
              class="drawer__radio"
              :class="{ 'drawer__radio--selected': selectedAge === opt.value }"
            >
              <div v-if="selectedAge === opt.value" class="drawer__radio-dot" />
            </div>
            <span>{{ opt.label }}</span>
          </button>
        </div>
        <!-- Sin botón Aplicar — se cierra al seleccionar -->
      </div>
    </template>
  </UDrawer>

  <!-- ── Drawer: Ciudad ─────────────────────────────────────────── -->
  <!-- Multi-select: se mantiene abierto, botón Aplicar para confirmar -->
  <UDrawer v-model:open="cityDrawerOpen" direction="bottom">
    <template #content>
      <div class="drawer drawer--scrollable">
        <h3 class="drawer__title">{{ t('search.city') }}</h3>

        <!-- Lista scrolleable por si hay muchas ciudades -->
        <div class="drawer__options drawer__options--scroll" data-vaul-no-drag>
          <button
            v-for="opt in cityOptions"
            :key="opt.value"
            type="button"
            class="drawer__option"
            @click="toggleCity(opt.value as string)"
          >
            <div
              class="drawer__checkbox"
              :class="{ 'drawer__checkbox--selected': isCitySelected(opt.value as string) }"
            >
              <UIcon
                v-if="isCitySelected(opt.value as string)"
                name="i-heroicons-check"
                class="drawer__check-icon"
              />
            </div>
            <span>{{ opt.label }}</span>
          </button>
        </div>

        <!-- Botón Aplicar — cierra el drawer -->
        <button
          type="button"
          class="sf-btn-search sf-btn-search--drawer"
          @click="cityDrawerOpen = false"
        >
          {{ t('search.apply') }}
        </button>
      </div>
    </template>
  </UDrawer>

  <!-- ── Drawer: Temporada ──────────────────────────────────────── -->
  <!-- Radio: seleccionar cierra inmediatamente, sin botón Aplicar -->
  <UDrawer v-model:open="seasonDrawerOpen" direction="bottom">
    <template #content>
      <div class="drawer">
        <h3 class="drawer__title">{{ t('search.season') }}</h3>
        <div class="drawer__options">
          <button
            v-for="opt in seasonOptions"
            :key="opt.value"
            type="button"
            class="drawer__option"
            @click="selectSeason(opt.value as SeasonValue)"
          >
            <div
              class="drawer__radio"
              :class="{ 'drawer__radio--selected': selectedSeason === opt.value }"
            >
              <div v-if="selectedSeason === opt.value" class="drawer__radio-dot" />
            </div>
            <UIcon
              :name="seasonIcons[opt.value as string] ?? 'i-heroicons-sparkles'"
              class="sf-pill-icon"
            />
            <span>{{ opt.label }}</span>
          </button>
        </div>
        <!-- Sin botón Aplicar — se cierra al seleccionar -->
      </div>
    </template>
  </UDrawer>

  <UDrawer v-model:open="categoryDrawerOpen" direction="bottom">
    <template #content>
      <div class="drawer">
        <h3 class="drawer__title">{{ t('search.category') }}</h3>
        <div class="drawer__options">
          <button
            v-for="opt in categoryOptions"
            :key="opt.value"
            type="button"
            class="drawer__option"
            @click="selectCategory(opt.value)"
          >
            <div
              class="drawer__radio"
              :class="{ 'drawer__radio--selected': selectedCategory === opt.value }"
            >
              <div v-if="selectedCategory === opt.value" class="drawer__radio-dot" />
            </div>
            <span>{{ opt.label }}</span>
          </button>
        </div>
      </div>
    </template>
  </UDrawer>
</template>

<style scoped>
/* ── Card — sin shadow/border en mobile, con card en desktop ─────── */
.sf-card {
  background: transparent;
  padding: 0;
  width: 100%;
}

/* ── Input búsqueda — base ───────────────────────────────────────── */
.sf-search-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-3);
}

.sf-search-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.sf-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: transparent;
  font-family: var(--font-family-base);
}

.sf-search-input::placeholder {
  color: var(--color-text-tertiary);
}

/* ── Placeholder dinámico (overlay sobre el input) ────────────────── */
.sf-search-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.sf-search-input-wrap .sf-search-input {
  position: relative;
  z-index: 1;
}

.sf-rotating-placeholder {
  position: absolute;
  inset-inline-start: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: baseline;
  gap: 0.3em;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-base);
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
  pointer-events: none;
}

.sf-rotating-placeholder__prefix {
  flex-shrink: 0;
}

.sf-rotating-placeholder__word {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-rotate-enter-active,
.sf-rotate-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.sf-rotate-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.sf-rotate-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.sf-search-row--bordered {
  border: 1.5px solid var(--color-neutral-200);
  border-radius: var(--border-radius-lg);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-3);
  background: var(--color-bg-primary);
  transition: border-color var(--transition-fast);
}

.sf-search-row--bordered:focus-within {
  border-color: var(--color-secondary-400);
}

/* ── Mobile wrapper ──────────────────────────────────────────────── */
.sf-mobile-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* ── Pills con scroll horizontal ────────────────────────────────── */
.sf-mobile-pills-wrap {
  position: relative;
}

.sf-mobile-pills {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--space-1-5, 0.375rem);
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: var(--space-1);
}

.sf-mobile-pills::-webkit-scrollbar {
  display: none;
}

/* ── Flechas indicadoras de scroll ─────────────────────────────── */
.sf-scroll-hint {
  position: absolute;
  top: 0;
  bottom: var(--space-1);
  display: flex;
  align-items: center;
  width: 2.25rem;
  pointer-events: none;
}

.sf-scroll-hint--right {
  right: 0;
  justify-content: flex-end;
  background: linear-gradient(to right, transparent, var(--color-bg-primary) 65%);
}

.sf-scroll-hint--left {
  left: 0;
  justify-content: flex-start;
  background: linear-gradient(to left, transparent, var(--color-bg-primary) 65%);
}

.sf-scroll-hint__icon {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--color-accent-600);
}

.sf-scroll-hint--right .sf-scroll-hint__icon {
  animation: sf-hint-bounce-right 1.4s ease-in-out infinite;
}

.sf-scroll-hint--left .sf-scroll-hint__icon {
  animation: sf-hint-bounce-left 1.4s ease-in-out infinite;
}

@keyframes sf-hint-bounce-right {
  0%,
  100% {
    transform: translateX(0);
    opacity: 0.7;
  }
  50% {
    transform: translateX(5px);
    opacity: 1;
  }
}

@keyframes sf-hint-bounce-left {
  0%,
  100% {
    transform: translateX(0);
    opacity: 0.7;
  }
  50% {
    transform: translateX(-5px);
    opacity: 1;
  }
}

/* ── Pill ────────────────────────────────────────────────────────── */
.sf-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--border-radius-full);
  border: 1.5px solid var(--color-secondary-300);
  background: var(--color-bg-primary);
  color: var(--color-secondary-700);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1;
  min-height: 2.25rem;
  scroll-snap-align: start;
}

.sf-pill:hover {
  border-color: var(--color-secondary-400);
  background-color: var(--color-secondary-50);
}

.sf-pill--active {
  border-color: var(--color-secondary-500);
  background-color: var(--color-secondary-100);
  color: var(--color-secondary-800);
}

.sf-pill--active:hover {
  background-color: var(--color-secondary-200);
}

.sf-pill-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
}

.sf-pill-x {
  width: 0.75rem;
  height: 0.75rem;
  opacity: 0.6;
  flex-shrink: 0;
}

/* ── Desktop — oculto en mobile ──────────────────────────────────── */
.sf-desktop {
  display: none;
}

.sf-desktop-filters {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-4);
}

.sf-select-wrap--checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2);
}

.sf-free-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  user-select: none;
  white-space: nowrap;
}

.sf-checkbox {
  width: 1.125rem;
  height: 1.125rem;
  border-radius: var(--border-radius-sm);
  border: 1.5px solid var(--color-neutral-300);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  background: var(--color-bg-primary);
}

.sf-checkbox--checked {
  border-color: var(--color-secondary-500);
  background-color: var(--color-secondary-500);
}

.sf-checkbox-icon {
  width: 0.75rem;
  height: 0.75rem;
  color: white;
}

/* ── Botones buscar ──────────────────────────────────────────────── */
.sf-btn-search {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-lg);
  background-color: var(--color-accent-500);
  color: white;
  font-weight: var(--font-weight-semibold);
  border: none;
  cursor: pointer;
  overflow: hidden;
  transition: background-color var(--transition-fast);
}

.sf-btn-search__content {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

/* Shine sweep: un brillo diagonal recorre el botón en loop para llamar la atención */
.sf-btn-search--shine::after {
  content: '';
  position: absolute;
  inset: 0;
  left: -60%;
  width: 40%;
  background: linear-gradient(115deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  animation: sf-btn-shine 2.8s ease-in-out infinite;
}

@keyframes sf-btn-shine {
  0% {
    left: -60%;
  }
  55% {
    left: 130%;
  }
  100% {
    left: 130%;
  }
}

.sf-btn-search:hover {
  background-color: var(--color-accent-600);
}

.sf-btn-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.sf-btn-search--desktop {
  width: 50%;
  margin: 0 auto;
  display: flex;
  padding: var(--space-3);
  font-size: var(--font-size-base);
  margin-top: 2rem;
}

.sf-btn-search--mobile {
  width: 100%;
  padding: var(--space-3);
  font-size: var(--font-size-base);
  margin-top: 1rem;
}

.sf-btn-search--drawer {
  width: 100%;
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
}

/* ── Responsive ──────────────────────────────────────────────────── */
@media (min-width: 768px) {
  .sf-card {
    background: var(--color-bg-primary);
    border-radius: var(--border-radius-2xl);
    box-shadow: var(--shadow-lg);
    padding: var(--space-8);
  }

  .sf-mobile-wrapper {
    display: none;
  }
  .sf-desktop {
    display: block;
  }
}

/* ── Drawers ─────────────────────────────────────────────────────── */
.drawer--scrollable {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.drawer__options--scroll {
  overflow-y: auto;
  flex: 1;
}

.drawer {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.drawer__title {
  font-family: var(--font-family-display);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.drawer__options {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.drawer__option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  background: none;
  border: none;
  width: 100%;
  text-align: start;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.drawer__option:hover {
  color: var(--color-secondary-600);
}

.drawer__radio {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: var(--border-radius-full);
  border: 2px solid var(--color-neutral-300);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.drawer__radio--selected {
  border-color: var(--color-secondary-500);
  background-color: var(--color-secondary-500);
}

.drawer__radio-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--border-radius-full);
  background: white;
}

.drawer__checkbox {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: var(--border-radius-sm);
  border: 2px solid var(--color-neutral-300);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.drawer__checkbox--selected {
  border-color: var(--color-secondary-500);
  background-color: var(--color-secondary-500);
}

.drawer__check-icon {
  width: 0.75rem;
  height: 0.75rem;
  color: white;
}
</style>
