<script setup lang="ts">
import type { SeasonValue } from '~/types'

const { t } = useI18n()
const { tc } = useI18nContent()
const router = useRouter()

const { ageOptions, cityOptions, seasonOptions, buildQueryFromFilters } = useActivityFilters()
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
const toggleAge = (id: number) => {
  selectedAge.value = selectedAge.value === id ? undefined : id
}

const toggleCity = (city: string) => {
  const idx = selectedCities.value.indexOf(city)
  if (idx === -1) selectedCities.value.push(city)
  else selectedCities.value.splice(idx, 1)
}

const toggleCategory = (val: string) => {
  selectedCategory.value = selectedCategory.value === val ? undefined : val
}

const isCitySelected = (city: string) => selectedCities.value.includes(city)

const toggleSeason = (val: SeasonValue) => {
  selectedSeason.value = selectedSeason.value === val ? undefined : val
}

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
  void router.push({ path: '/search', query })
}

// ── Íconos temporada (solo drawer) ───────────────────────────────
const seasonIcons: Record<string, string> = {
  spring: 'i-heroicons-sun',
  summer: 'i-heroicons-fire',
  fall: 'i-heroicons-cloud',
  winter: 'i-heroicons-snowflake',
}
</script>

<template>
  <div class="sf-card">
    <form @submit.prevent="handleSearch">
      <!-- ── MOBILE wrapper — oculto en desktop ──────────────────── -->
      <div class="sf-mobile-wrapper">
        <!-- Input bordeado — ícono y texto en la misma fila -->
        <div class="sf-search-row sf-search-row--bordered">
          <UIcon name="i-heroicons-magnifying-glass" class="sf-search-icon" />
          <input
            v-model="searchText"
            class="sf-search-input"
            :placeholder="t('hero.search_placeholder')"
            type="text"
          />
        </div>

        <!-- Pills con scroll horizontal -->
        <div class="sf-mobile-pills">
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

        <!-- Botón buscar mobile — full width -->
        <button type="submit" class="sf-btn-search sf-btn-search--mobile">
          <UIcon name="i-heroicons-magnifying-glass" class="sf-btn-icon" />
          {{ t('search.search_button') }}
        </button>
      </div>

      <!-- ── DESKTOP — oculto en mobile ──────────────────────────── -->
      <div class="sf-desktop">
        <!-- Input bordeado desktop -->
        <div class="sf-search-row sf-search-row--bordered">
          <UIcon name="i-heroicons-magnifying-glass" class="sf-search-icon" />
          <input
            v-model="searchText"
            class="sf-search-input"
            :placeholder="t('hero.search_placeholder')"
            type="text"
          />
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
        <button type="submit" class="sf-btn-search sf-btn-search--desktop">
          <UIcon name="i-heroicons-magnifying-glass" class="sf-btn-icon" />
          {{ t('search.search_button') }}
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
            @click="
              toggleAge(opt.value)
              ageDrawerOpen = false
            "
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
            @click="
              toggleSeason(opt.value as SeasonValue)
              seasonDrawerOpen = false
            "
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
            @click="
              toggleCategory(opt.value)
              categoryDrawerOpen = false
            "
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
.sf-mobile-pills {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: var(--space-1);
}

.sf-mobile-pills::-webkit-scrollbar {
  display: none;
}

/* ── Pill ────────────────────────────────────────────────────────── */
.sf-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--border-radius-lg);
  background-color: var(--color-secondary-500);
  color: white;
  font-weight: var(--font-weight-semibold);
  border: none;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.sf-btn-search:hover {
  background-color: var(--color-secondary-600);
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
/* ── Card ────────────────────────────────────────────────────────── */ .sf-card { background:
var(--color-bg-primary); border-radius: var(--border-radius-2xl); box-shadow: var(--shadow-lg);
padding: var(--space-6); width: 100%; } /* ── Input búsqueda — base
───────────────────────────────────────── */ .sf-search-row { display: flex; flex-direction: row; /*
← fuerza row para que ícono y input estén en línea */ align-items: center; gap: var(--space-3); }
.sf-search-icon { width: 1.25rem; height: 1.25rem; color: var(--color-text-tertiary); flex-shrink:
0; } .sf-search-input { flex: 1; border: none; outline: none; font-size: var(--font-size-base);
color: var(--color-text-primary); background: transparent; font-family: var(--font-family-base); }
.sf-search-input::placeholder { color: var(--color-text-tertiary); } /* ── Input bordeado — mismo
estilo en mobile y desktop ──────────── */ .sf-search-row--bordered { border: 1.5px solid
var(--color-neutral-200); border-radius: var(--border-radius-lg); padding: var(--space-3)
var(--space-4); margin-bottom: var(--space-3); transition: border-color var(--transition-fast); }
.sf-search-row--bordered:focus-within { border-color: var(--color-secondary-400); } /* ── Mobile
wrapper — visible solo en mobile ─────────────────────── */ .sf-mobile-wrapper { display: flex;
flex-direction: column; gap: var(--space-2); } /* ── Pills con scroll horizontal — una sola línea
───────────────── */ .sf-mobile-pills { display: flex; flex-wrap: nowrap; gap: var(--space-2);
overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: var(--space-1); }
.sf-mobile-pills::-webkit-scrollbar { display: none; } /* ── Drawer scrolleable (ciudad con muchas
opciones) ─────────────── */ .drawer--scrollable { max-height: 70vh; display: flex; flex-direction:
column; } .drawer__options--scroll { overflow-y: auto; flex: 1; /* data-vaul-no-drag evita que el
scroll cierre el drawer en Vaul */ } /* ── Pill
────────────────────────────────────────────────────────── */ .sf-pill { display: inline-flex;
align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-4); border-radius:
var(--border-radius-full); border: 1.5px solid var(--color-secondary-300); background: transparent;
color: var(--color-secondary-700); font-size: var(--font-size-sm); font-weight:
var(--font-weight-medium); cursor: pointer; transition: all var(--transition-fast); white-space:
nowrap; flex-shrink: 0; line-height: 1; min-height: 2.25rem; /* touch-friendly */ } .sf-pill:hover {
border-color: var(--color-secondary-400); background-color: var(--color-secondary-50); }
.sf-pill--active { border-color: var(--color-secondary-500); background-color:
var(--color-secondary-100); color: var(--color-secondary-800); } .sf-pill--active:hover {
background-color: var(--color-secondary-200); } .sf-pill-icon { width: 0.875rem; height: 0.875rem;
flex-shrink: 0; } .sf-pill-x { width: 0.75rem; height: 0.75rem; opacity: 0.6; flex-shrink: 0; } /*
── Desktop — oculto en mobile ──────────────────────────────────── */ .sf-desktop { display: none; }
/* ── Desktop filters: 4 columnas ────────────────────────────────── */ .sf-desktop-filters {
display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: var(--space-3); align-items:
center; margin-bottom: var(--space-4); } .sf-select-wrap--checkbox { display: flex; align-items:
center; justify-content: center; padding: var(--space-2); } /* ── Checkbox custom
─────────────────────────────────────────────── */ .sf-free-label { display: flex; align-items:
center; gap: var(--space-2); cursor: pointer; font-size: var(--font-size-sm); color:
var(--color-text-secondary); user-select: none; white-space: nowrap; } .sf-checkbox { width:
1.125rem; height: 1.125rem; border-radius: var(--border-radius-sm); border: 1.5px solid
var(--color-neutral-300); display: flex; align-items: center; justify-content: center; flex-shrink:
0; transition: all var(--transition-fast); background: var(--color-bg-primary); }
.sf-checkbox--checked { border-color: var(--color-secondary-500); background-color:
var(--color-secondary-500); } .sf-checkbox-icon { width: 0.75rem; height: 0.75rem; color: white; }
/* ── Botones buscar ──────────────────────────────────────────────── */ .sf-btn-search { display:
inline-flex; align-items: center; justify-content: center; gap: var(--space-2); border-radius:
var(--border-radius-lg); background-color: var(--color-secondary-500); color: white; font-weight:
var(--font-weight-semibold); border: none; cursor: pointer; transition: background-color
var(--transition-fast); } .sf-btn-search:hover { background-color: var(--color-secondary-600); }
.sf-btn-icon { width: 1rem; height: 1rem; flex-shrink: 0; } /* Desktop: 50% centrado */
.sf-btn-search--desktop { width: 50%; margin: 0 auto; display: flex; padding: var(--space-3);
font-size: var(--font-size-base); margin-top: 2rem; } /* Mobile: full width */
.sf-btn-search--mobile { width: 100%; padding: var(--space-3); font-size: var(--font-size-base); }
/* Drawer: full width */ .sf-btn-search--drawer { width: 100%; padding: var(--space-2)
var(--space-4); font-size: var(--font-size-sm); } /* ── Responsive
──────────────────────────────────────────────────── */ @media (min-width: 768px) { .sf-card {
padding: var(--space-8); } /* Ocultar mobile wrapper, mostrar desktop */ .sf-mobile-wrapper {
display: none; } .sf-desktop { display: block; } } /* ── Drawers
─────────────────────────────────────────────────────── */ .drawer { padding: var(--space-6);
display: flex; flex-direction: column; gap: var(--space-4); } .drawer__title { font-family:
var(--font-family-display); font-size: var(--font-size-lg); font-weight:
var(--font-weight-semibold); color: var(--color-text-primary); } .drawer__options { display: flex;
flex-direction: column; gap: var(--space-1); } .drawer__option { display: flex; align-items: center;
gap: var(--space-3); padding: var(--space-2) 0; background: none; border: none; width: 100%;
text-align: start; font-size: var(--font-size-sm); color: var(--color-text-primary); cursor:
pointer; transition: color var(--transition-fast); } .drawer__option:hover { color:
var(--color-secondary-600); } .drawer__radio { width: 1.25rem; height: 1.25rem; border-radius:
var(--border-radius-full); border: 2px solid var(--color-neutral-300); display: flex; align-items:
center; justify-content: center; flex-shrink: 0; transition: all var(--transition-fast); }
.drawer__radio--selected { border-color: var(--color-secondary-500); background-color:
var(--color-secondary-500); } .drawer__radio-dot { width: 0.5rem; height: 0.5rem; border-radius:
var(--border-radius-full); background: white; } .drawer__checkbox { width: 1.25rem; height: 1.25rem;
border-radius: var(--border-radius-sm); border: 2px solid var(--color-neutral-300); display: flex;
align-items: center; justify-content: center; flex-shrink: 0; transition: all
var(--transition-fast); } .drawer__checkbox--selected { border-color: var(--color-secondary-500);
background-color: var(--color-secondary-500); } .drawer__check-icon { width: 0.75rem; height:
0.75rem; color: white; }
<!-- </style>  -->
