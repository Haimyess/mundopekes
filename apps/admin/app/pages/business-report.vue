<script setup lang="ts">
import { useRoute } from 'vue-router'
import type { Period } from '~/types'
import EventsChart from '~/components/user-events/EventsChart.client.vue'

const { t, locale } = useI18n()
const { tc } = useI18nContent()
const route = useRoute()

const { range, entityType, entityId, options, report, isLoading, loadOptions, loadReport } =
  useBusinessReport()

const period = ref<Period>('daily')

const entityTypeOptions = computed(() => [
  { label: t('businessReport.typePlace'), value: 'place' as const },
  { label: t('businessReport.typeProvider'), value: 'provider' as const },
  { label: t('businessReport.typeActivity'), value: 'activity' as const },
])

const entityOptions = computed(() => {
  if (!options.value) return []
  if (entityType.value === 'place') {
    return options.value.places.map((p) => ({
      label: `${tc(p.name_i18n)}${p.city ? ` · ${p.city.name}` : ''}`,
      id: p.id,
    }))
  }
  if (entityType.value === 'activity') {
    return options.value.activities.map((a) => ({
      label: `${tc(a.title_i18n)}${a.place ? ` (${tc(a.place.name_i18n)})` : ''}`,
      id: a.id,
    }))
  }
  return options.value.providers.map((p) => ({ label: p.name, id: p.id }))
})

const selectedEntity = computed({
  get: () => entityOptions.value.find((o) => o.id === entityId.value) ?? undefined,
  set: (val) => {
    entityId.value = val?.id ?? null
  },
})

// Cambiar de tipo (Lugar/Proveedor) invalida la selección anterior — un id de
// lugar no es válido como id de proveedor.
watch(entityType, () => {
  entityId.value = null
})

const formatNumber = (value: number) => new Intl.NumberFormat(locale.value).format(value)

onMounted(async () => {
  await loadOptions()
  if (
    typeof route.query.type === 'string' &&
    (route.query.type === 'place' || route.query.type === 'provider')
  ) {
    entityType.value = route.query.type
  }
  if (typeof route.query.id === 'string') {
    entityId.value = route.query.id
    await loadReport()
  }
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('businessReport.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="isLoading"
            :disabled="!entityId"
            @click="loadReport"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <USelect
            v-model="entityType"
            :items="entityTypeOptions"
            value-key="value"
            label-key="label"
            class="w-36"
          />
          <USelectMenu
            v-model="selectedEntity"
            :items="entityOptions"
            label-key="label"
            searchable
            :placeholder="t('businessReport.entityPlaceholder')"
            class="w-64"
          />
          <HomeDateRangePicker v-model="range" />
          <HomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="p-4 flex flex-col gap-6">
        <p v-if="!entityId" class="text-sm text-(--ui-text-muted) text-center py-12">
          {{ t('businessReport.emptyState') }}
        </p>

        <template v-else-if="report">
          <!-- Encabezado del negocio -->
          <div class="bg-elevated rounded-2xl border border-default p-5 flex flex-col gap-3">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-xl font-bold">{{ report.entity.name }}</h2>
              <UBadge v-if="report.entity.city" color="neutral" variant="subtle">
                {{ report.entity.city }}
              </UBadge>
            </div>
            <div v-if="report.entity.categories.length > 0" class="flex flex-wrap gap-2">
              <UBadge
                v-for="cat in report.entity.categories"
                :key="cat.slug"
                color="primary"
                variant="subtle"
                size="sm"
              >
                {{ tc(cat.name_i18n) }}
              </UBadge>
            </div>
          </div>

          <!-- Métricas atribuibles directamente -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-eye" class="size-4 text-primary" />
                <span class="text-xs text-(--ui-text-muted)">{{ t('businessReport.views') }}</span>
              </div>
              <span class="text-3xl font-bold tabular-nums">{{
                formatNumber(report.report.views)
              }}</span>
            </div>
            <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-navigation" class="size-4 text-primary" />
                <span class="text-xs text-(--ui-text-muted)">{{
                  t('businessReport.directions')
                }}</span>
              </div>
              <span class="text-3xl font-bold tabular-nums">{{
                formatNumber(report.report.directions)
              }}</span>
            </div>
            <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-message-circle" class="size-4 text-primary" />
                <span class="text-xs text-(--ui-text-muted)">{{
                  t('businessReport.contacts')
                }}</span>
              </div>
              <span class="text-3xl font-bold tabular-nums">{{
                formatNumber(report.report.contacts)
              }}</span>
            </div>
            <div class="bg-elevated rounded-2xl p-5 flex flex-col gap-2 border border-default">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-users" class="size-4 text-primary" />
                <span class="text-xs text-(--ui-text-muted)">{{
                  t('businessReport.uniqueSessions')
                }}</span>
              </div>
              <span class="text-3xl font-bold tabular-nums">{{
                formatNumber(report.report.uniqueSessions)
              }}</span>
            </div>
          </div>

          <!-- Sesiones que buscaron y después vieron este negocio -->
          <DashboardSectionCard :title="t('businessReport.searchingSessionsTitle')">
            <div class="flex items-center gap-4">
              <span class="text-4xl font-bold tabular-nums text-primary">{{
                formatNumber(report.report.searchingSessions)
              }}</span>
              <p class="text-sm text-(--ui-text-muted)">
                {{ t('businessReport.searchingSessionsHint') }}
              </p>
            </div>
          </DashboardSectionCard>

          <!-- Contexto de mercado -->
          <DashboardSectionCard
            :title="t('businessReport.marketContextTitle')"
            :subtitle="t('businessReport.marketContextHint')"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1">
                <span class="text-xs text-(--ui-text-muted)">{{
                  t('businessReport.categorySearches')
                }}</span>
                <span class="text-2xl font-bold tabular-nums">{{
                  formatNumber(report.marketContext.categorySearches)
                }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-xs text-(--ui-text-muted)">{{
                  t('businessReport.citySearches')
                }}</span>
                <span class="text-2xl font-bold tabular-nums">{{
                  formatNumber(report.marketContext.citySearches)
                }}</span>
              </div>
            </div>
          </DashboardSectionCard>

          <!-- Tendencia -->
          <DashboardSectionCard :title="t('businessReport.trendTitle')">
            <p
              v-if="report.timeseries.length === 0"
              class="text-sm text-(--ui-text-muted) text-center py-8"
            >
              {{ t('businessReport.emptyTrend') }}
            </p>
            <EventsChart v-else :data="report.timeseries" :period="period" />
          </DashboardSectionCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
