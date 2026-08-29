<script setup lang="ts">
import type { Activity, ActivityFilters, SeasonValue } from '~/types'
import type { SelectOption } from '~/types/ui'

const { t } = useI18n()
const { tc } = useI18nContent()
const store = useActivitiesStore()
const { getNavCategories } = useCategories()

const props = defineProps<{
  modelValue: ActivityFilters
  baseActivities: Activity[]
  loadingBase?: boolean
}>()

const emit = defineEmits<{
  apply: [filters: ActivityFilters]
  clear: []
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const localFilters = ref<ActivityFilters>({ ...props.modelValue })

onMounted(async () => {
  const cats = await getNavCategories()
  CATEGORY_OPTIONS.value = cats.map((c) => ({ label: tc(c.name_i18n), value: c.slug }))
})

watch(
  () => props.modelValue,
  (val) => {
    localFilters.value = { ...val }
  },
  { deep: true }
)

// ── Opciones desde el store ───────────────────────────────────────
const AGE_OPTIONS = computed(() =>
  store.filterOptions.ageRanges
    .filter((r) => r.label_key.startsWith('age.') && r.label_key !== 'age.all')
    .map((r) => ({
      label: t(`search.${r.label_key.replace('.', '_')}`),
      value: r.id,
      min: r.min_months,
      max: r.max_months,
    }))
)

const CITY_OPTIONS = computed(() =>
  store.filterOptions.cities.map((c) => ({ label: c.name, value: c.name }))
)

const SEASON_OPTIONS: SelectOption[] = [
  { label: t('search.season_spring'), value: 'spring' },
  { label: t('search.season_summer'), value: 'summer' },
  { label: t('search.season_fall'), value: 'fall' },
  { label: t('search.season_winter'), value: 'winter' },
]

const CATEGORY_OPTIONS = ref<{ label: string; value: string }[]>([])

// ── Conteos dinámicos via composable compartido ───────────────────
const { countForAge, countForCity, countForSeason, countForExtra, previewCount } = useFilterCounts(
  computed(() => props.baseActivities),
  localFilters
)

// ── Modelos locales ───────────────────────────────────────────────
const selectedAgeKey = computed({
  get: () => {
    if (localFilters.value.age_id === undefined) return undefined
    return AGE_OPTIONS.value.find((o) => o.value === localFilters.value.age_id)?.value
  },
  set: (id: number | undefined) => {
    const option = AGE_OPTIONS.value.find((o) => o.value === id)
    if (option) {
      localFilters.value.age_id = option.value
      localFilters.value.age_min = option.min
      localFilters.value.age_max = option.max
    } else {
      delete localFilters.value.age_id
      delete localFilters.value.age_min
      delete localFilters.value.age_max
    }
  },
})

const selectedCities = computed({
  get: () => (localFilters.value.city ? localFilters.value.city.split(',') : []),
  set: (cities: string[]) => {
    if (cities.length) localFilters.value.city = cities.join(',')
    else delete localFilters.value.city
  },
})

const selectedSeason = computed({
  get: () => localFilters.value.season,
  set: (s: SeasonValue | undefined) => {
    if (s) localFilters.value.season = s
    else delete localFilters.value.season
  },
})

const toggleCity = (city: string) => {
  const current = selectedCities.value
  const idx = current.indexOf(city)
  selectedCities.value = idx === -1 ? [...current, city] : current.filter((c) => c !== city)
}

const toggleSeason = (s: string) => {
  selectedSeason.value = selectedSeason.value === s ? undefined : (s as SeasonValue)
}

const isFree = computed({
  get: () => localFilters.value.is_free ?? false,
  set: (v: boolean) => {
    if (v) localFilters.value.is_free = true
    else delete localFilters.value.is_free
  },
})

const isStrollerFriendly = computed({
  get: () => localFilters.value.stroller_friendly ?? false,
  set: (v: boolean) => {
    if (v) localFilters.value.stroller_friendly = true
    else delete localFilters.value.stroller_friendly
  },
})

const isOpenWeekends = computed({
  get: () => localFilters.value.open_weekends ?? false,
  set: (v: boolean) => {
    if (v) localFilters.value.open_weekends = true
    else delete localFilters.value.open_weekends
  },
})

const selectedCategory = computed({
  get: () => localFilters.value.category,
  set: (v: string | undefined) => {
    if (v) localFilters.value.category = v
    else delete localFilters.value.category
  },
})

// Cuenta todos los filtros activos incluyendo search
const activeCount = computed(() => Object.keys(localFilters.value).length)

// ── Acordeones ────────────────────────────────────────────────────
// Cada tipo de filtro es su propio acordeón; solo los dos primeros
// (categoría, edad) empiezan abiertos. "Extras" (checkboxes) no es
// un acordeón — siempre visible.
const open = reactive({
  category: true,
  age: true,
  city: false,
  season: false,
})
function toggleSection(key: keyof typeof open) {
  open[key] = !open[key]
}

// ── Acciones ──────────────────────────────────────────────────────
const applyFilters = () => {
  emit('apply', { ...localFilters.value })
  isOpen.value = false
}

const cancel = () => {
  localFilters.value = { ...props.modelValue }
  isOpen.value = false
}

const clearAll = () => {
  isOpen.value = false
  emit('clear')
}
</script>

<template>
  <UDrawer
    v-model:open="isOpen"
    direction="bottom"
    :handle="true"
    :ui="{
      content: 'flex flex-col rounded-t-2xl',
      header: 'shrink-0',
      body: 'p-0 flex flex-col min-h-0 flex-1',
      footer: 'shrink-0',
    }"
  >
    <!-- Header -->
    <template #header>
      <div class="drawer-header">
        <h2 class="drawer-header__title">{{ t('search.filters') }}</h2>
        <button v-if="activeCount > 0" class="drawer-header__clear" @click="clearAll">
          {{ t('search.clear_filters') }}
        </button>
      </div>
    </template>

    <!-- Body scrolleable -->
    <template #body>
      <div class="drawer-body" data-vaul-no-drag>
        <!-- Skeleton mientras cargan las baseActivities -->
        <template v-if="loadingBase">
          <div v-for="n in 4" :key="n" class="drawer-section">
            <USkeleton class="h-4 w-24 rounded" />
            <div class="drawer-section__grid">
              <USkeleton v-for="i in 4" :key="i" class="h-10 rounded-xl" />
            </div>
          </div>
        </template>

        <template v-else>
          <!-- ── Categoría ────────────────────────────────────────────────── -->
          <section class="drawer-section">
            <button
              type="button"
              class="drawer-section__trigger"
              @click="toggleSection('category')"
            >
              <h3 class="drawer-section__title">{{ t('search.category') }}</h3>
              <UIcon
                name="i-heroicons-chevron-down"
                class="drawer-section__chevron"
                :class="{ 'drawer-section__chevron--open': open.category }"
              />
            </button>
            <div v-show="open.category" class="drawer-section__grid">
              <button
                v-for="opt in CATEGORY_OPTIONS"
                :key="opt.value"
                class="option-btn"
                :class="{ 'option-btn--selected': selectedCategory === opt.value }"
                @click="selectedCategory = selectedCategory === opt.value ? undefined : opt.value"
              >
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </section>

          <!-- ── Edad ─────────────────────────────────────────────── -->
          <section class="drawer-section">
            <button type="button" class="drawer-section__trigger" @click="toggleSection('age')">
              <h3 class="drawer-section__title">{{ t('search.age') }}</h3>
              <UIcon
                name="i-heroicons-chevron-down"
                class="drawer-section__chevron"
                :class="{ 'drawer-section__chevron--open': open.age }"
              />
            </button>
            <div v-show="open.age" class="drawer-section__grid">
              <button
                v-for="opt in AGE_OPTIONS"
                :key="opt.value"
                class="option-btn"
                :class="{
                  'option-btn--selected': selectedAgeKey === opt.value,
                  'option-btn--disabled': countForAge(opt) === 0 && selectedAgeKey !== opt.value,
                }"
                :disabled="countForAge(opt) === 0 && selectedAgeKey !== opt.value"
                @click="selectedAgeKey = selectedAgeKey === opt.value ? undefined : opt.value"
              >
                <span>{{ opt.label }}</span>
                <span
                  v-if="selectedAgeKey !== opt.value && countForAge(opt) > 0"
                  class="option-btn__count"
                >
                  {{ countForAge(opt) }}
                </span>
              </button>
            </div>
          </section>

          <USeparator />

          <!-- ── Ciudad ───────────────────────────────────────────── -->
          <section class="drawer-section">
            <button type="button" class="drawer-section__trigger" @click="toggleSection('city')">
              <h3 class="drawer-section__title">{{ t('search.city') }}</h3>
              <UIcon
                name="i-heroicons-chevron-down"
                class="drawer-section__chevron"
                :class="{ 'drawer-section__chevron--open': open.city }"
              />
            </button>
            <div v-show="open.city" class="drawer-section__list">
              <button
                v-for="opt in CITY_OPTIONS"
                :key="opt.value"
                class="city-btn"
                :class="{
                  'city-btn--disabled':
                    countForCity(opt.value as string) === 0 &&
                    !selectedCities.includes(opt.value as string),
                }"
                :disabled="
                  countForCity(opt.value as string) === 0 &&
                  !selectedCities.includes(opt.value as string)
                "
                @click="toggleCity(opt.value as string)"
              >
                <div
                  class="city-btn__checkbox"
                  :class="
                    selectedCities.includes(opt.value as string)
                      ? 'city-btn__checkbox--checked'
                      : 'city-btn__checkbox--unchecked'
                  "
                >
                  <UIcon
                    v-if="selectedCities.includes(opt.value as string)"
                    name="i-heroicons-check"
                    class="city-btn__check-icon"
                  />
                </div>
                <span class="city-btn__label">{{ opt.label }}</span>
                <span
                  v-if="
                    !selectedCities.includes(opt.value as string) &&
                    countForCity(opt.value as string) > 0
                  "
                  class="city-btn__count"
                >
                  {{ countForCity(opt.value as string) }}
                </span>
              </button>
            </div>
          </section>

          <USeparator />

          <!-- ── Temporada ─────────────────────────────────────────── -->
          <section class="drawer-section">
            <button type="button" class="drawer-section__trigger" @click="toggleSection('season')">
              <h3 class="drawer-section__title">{{ t('search.season') }}</h3>
              <UIcon
                name="i-heroicons-chevron-down"
                class="drawer-section__chevron"
                :class="{ 'drawer-section__chevron--open': open.season }"
              />
            </button>
            <div v-show="open.season" class="drawer-section__grid">
              <button
                v-for="opt in SEASON_OPTIONS"
                :key="opt.value"
                class="option-btn"
                :class="{
                  'option-btn--selected': selectedSeason === opt.value,
                  'option-btn--disabled':
                    countForSeason(opt.value as string) === 0 && selectedSeason !== opt.value,
                }"
                :disabled="
                  countForSeason(opt.value as string) === 0 && selectedSeason !== opt.value
                "
                @click="toggleSeason(opt.value as string)"
              >
                <span>{{ opt.label }}</span>
                <span
                  v-if="selectedSeason !== opt.value && countForSeason(opt.value as string) > 0"
                  class="option-btn__count"
                >
                  {{ countForSeason(opt.value as string) }}
                </span>
              </button>
            </div>
          </section>

          <USeparator />

          <!-- ── Extras ────────────────────────────────────────────── -->
          <section class="drawer-section">
            <h3 class="drawer-section__title">{{ t('search.extras') }}</h3>
            <div class="drawer-section__extras">
              <label
                class="extra-btn"
                :class="{ 'extra-btn--disabled': !isFree && countForExtra('is_free') === 0 }"
              >
                <UCheckbox v-model="isFree" :disabled="!isFree && countForExtra('is_free') === 0" />
                <span class="extra-btn__label">{{ t('search.free') }}</span>
                <span v-if="!isFree && countForExtra('is_free') > 0" class="extra-btn__count">
                  {{ countForExtra('is_free') }}
                </span>
              </label>

              <label
                class="extra-btn"
                :class="{
                  'extra-btn--disabled':
                    !isStrollerFriendly && countForExtra('stroller_friendly') === 0,
                }"
              >
                <UCheckbox
                  v-model="isStrollerFriendly"
                  :disabled="!isStrollerFriendly && countForExtra('stroller_friendly') === 0"
                />
                <span class="extra-btn__label">{{ t('activity.stroller_friendly') }}</span>
                <span
                  v-if="!isStrollerFriendly && countForExtra('stroller_friendly') > 0"
                  class="extra-btn__count"
                >
                  {{ countForExtra('stroller_friendly') }}
                </span>
              </label>

              <label
                class="extra-btn"
                :class="{
                  'extra-btn--disabled': !isOpenWeekends && countForExtra('open_weekends') === 0,
                }"
              >
                <UCheckbox
                  v-model="isOpenWeekends"
                  :disabled="!isOpenWeekends && countForExtra('open_weekends') === 0"
                />
                <span class="extra-btn__label">{{ t('activity.open_weekends') }}</span>
                <span
                  v-if="!isOpenWeekends && countForExtra('open_weekends') > 0"
                  class="extra-btn__count"
                >
                  {{ countForExtra('open_weekends') }}
                </span>
              </label>
            </div>
          </section>
        </template>
      </div>
    </template>

    <!-- Footer con preview de resultados -->
    <template #footer>
      <div class="drawer-footer">
        <UButton block size="lg" variant="outline" @click="cancel">
          {{ t('search.cancel') }}
        </UButton>
        <UButton block size="lg" :disabled="loadingBase" @click="applyFilters">
          <template v-if="loadingBase">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin w-4 h-4 mr-1" />
            {{ t('search.loading') }}
          </template>
          <template v-else>
            <!-- "Ver 12 actividades" — conteo reactivo antes de aplicar -->
            {{ t('search.see_results', { count: previewCount }) }}
          </template>
        </UButton>
      </div>
    </template>
  </UDrawer>
</template>

<style scoped>
/* ── Header ────────────────────────────────────────────────────── */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
}

.drawer-header__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

/* Botón limpiar — verde secondary */
.drawer-header__clear {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-secondary-600);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color var(--transition-fast);
}
.drawer-header__clear:hover {
  color: var(--color-secondary-800);
}

/* ── Body ──────────────────────────────────────────────────────── */
.drawer-body {
  overflow-y: auto;
  flex: 1;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* ── Secciones ─────────────────────────────────────────────────── */
.drawer-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.drawer-section__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Trigger acordeón (categoría / edad / ciudad / temporada) ─────── */
.drawer-section__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: start;
}

.drawer-section__chevron {
  width: 1rem;
  height: 1rem;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}

.drawer-section__chevron--open {
  transform: rotate(180deg);
}

.drawer-section__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

.drawer-section__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.drawer-section__extras {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ── Botón opción (edad / temporada) ───────────────────────────── */
.option-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--color-neutral-200);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: start;
}
.option-btn:hover:not(:disabled) {
  border-color: var(--color-neutral-300);
  background: var(--color-neutral-50);
}
.option-btn--selected {
  border-color: var(--color-accent-500) !important;
  background-color: var(--color-accent-50) !important;
  color: var(--color-accent-700) !important;
}
.option-btn--disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.option-btn__count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-normal);
}

/* ── Botón ciudad ──────────────────────────────────────────────── */
.city-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--border-radius-lg);
  border: none;
  background: none;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  text-align: start;
}
.city-btn:hover:not(:disabled) {
  background-color: var(--color-neutral-50);
}
.city-btn--disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.city-btn__checkbox {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--border-radius-sm);
  border-width: 2px;
  border-style: solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}
.city-btn__checkbox--unchecked {
  border-color: var(--color-neutral-300);
  background: transparent;
}
.city-btn__checkbox--checked {
  border-color: var(--color-accent-500);
  background-color: var(--color-accent-500);
}
.city-btn__check-icon {
  width: 0.875rem;
  height: 0.875rem;
  color: white;
}
.city-btn__label {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  flex: 1;
}
.city-btn__count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-inline-start: auto;
}

/* ── Extras ────────────────────────────────────────────────────── */
.extra-btn {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
}
.extra-btn--disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.extra-btn__label {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  flex: 1;
}
.extra-btn__count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* ── Footer ────────────────────────────────────────────────────── */
.drawer-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-neutral-100);
  display: flex;
  gap: var(--space-3);
}
</style>
