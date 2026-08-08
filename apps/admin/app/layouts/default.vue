<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()
const open = ref(false)

const links = computed(
  () =>
    [
      [
        {
          label: t('nav.dashboard'),
          icon: 'i-lucide-layout-dashboard',
          to: '/',
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: t('nav.places'),
          icon: 'i-lucide-map-pin',
          to: '/places',
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: t('nav.activities'),
          icon: 'i-lucide-zap',
          to: '/activities',
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: t('nav.suggestions'),
          icon: 'i-lucide-lightbulb',
          to: '/suggestions',
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: t('nav.categories'),
          icon: 'i-lucide-tag',
          to: '/categories',
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: t('nav.providers'),
          icon: 'i-lucide-store',
          to: '/providers',
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: t('nav.monitoring'),
          icon: 'i-lucide-activity',
          to: '/analytics',
          defaultOpen: false,
          type: 'trigger',
          children: [
            {
              label: t('nav.overview'),
              icon: 'i-lucide-layout-dashboard',
              to: '/overview',
              onSelect: () => {
                open.value = false
              },
            },
            {
              label: t('nav.systemLogs'),
              icon: 'i-lucide-terminal',
              to: '/system-logs',
              onSelect: () => {
                open.value = false
              },
            },
            {
              label: t('nav.userEvents'),
              icon: 'i-lucide-activity',
              to: '/user-events',
              onSelect: () => {
                open.value = false
              },
            },
            {
              label: t('nav.contactRequests'),
              icon: 'i-lucide-inbox',
              to: '/contact-requests',
              onSelect: () => {
                open.value = false
              },
            },
          ],
        },
        {
          label: t('nav.support'),
          icon: 'i-lucide-life-buoy',
          to: '/support',
          defaultOpen: false,
          type: 'trigger',
          children: [
            {
              label: t('nav.helpDesk'),
              to: '/support',
              exact: true,
              onSelect: () => {
                open.value = false
              },
            },
            {
              label: t('nav.faqs'),
              to: '/support/faqs',
              onSelect: () => {
                open.value = false
              },
            },
          ],
        },
        {
          label: t('nav.settings'),
          to: '/settings',
          icon: 'i-lucide-settings',
          defaultOpen: false,
          type: 'trigger',
          children: [
            {
              label: t('nav.settingsGeneral'),
              to: '/settings',
              exact: true,
              onSelect: () => {
                open.value = false
              },
            },
            {
              label: t('nav.settingsNotifications'),
              to: '/settings/notifications',
              onSelect: () => {
                open.value = false
              },
            },
            {
              label: t('nav.settingsSecurity'),
              to: '/settings/security',
              onSelect: () => {
                open.value = false
              },
            },
          ],
        },
      ],
    ] satisfies NavigationMenuItem[][]
)
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2 px-3 py-1">
          <span class="font-bold text-primary text-lg">
            {{ collapsed ? 'P' : 'Pekes' }}
          </span>
          <span v-if="!collapsed" class="text-xs text-muted">{{ t('nav.brand') }}</span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex flex-col gap-1 w-full">
          <LanguageSwitcher :collapsed="collapsed" />
          <UserMenu :collapsed="collapsed" />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch />
    <slot />
  </UDashboardGroup>
</template>
