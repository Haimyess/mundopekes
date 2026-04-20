<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)

const links = [
  [
    {
      label: 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: '/',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: 'Lugares',
      icon: 'i-lucide-map-pin',
      to: '/places',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: 'Actividades',
      icon: 'i-lucide-zap',
      to: '/activities',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: 'Sugerencias',
      icon: 'i-lucide-lightbulb',
      to: '/suggestions',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: 'Categorías',
      icon: 'i-lucide-tag',
      to: '/categories',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: 'Proveedores',
      icon: 'i-lucide-store',
      to: '/providers',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: 'Monitoreo',
      icon: 'i-lucide-activity',
      to: '/analytics',
      defaultOpen: false,
      type: 'trigger',
      children: [
        {
          label: 'Analytics',
          icon: 'i-lucide-bar-chart-2',
          to: '/analytics',
          exact: true,
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: 'Logs',
          icon: 'i-lucide-terminal',
          to: '/logs',
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: 'Consultas',
          icon: 'i-lucide-inbox',
          to: '/contact-requests',
          onSelect: () => {
            open.value = false
          },
        },
      ],
    },
    {
      label: 'Soporte',
      icon: 'i-lucide-life-buoy',
      to: '/support',
      defaultOpen: false,
      type: 'trigger',
      children: [
        {
          label: 'Help Desk',
          to: '/support',
          exact: true,
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: 'FAQs',
          to: '/support/faqs',
          onSelect: () => {
            open.value = false
          },
        },
      ],
    },
    {
      label: 'Settings',
      to: '/settings',
      icon: 'i-lucide-settings',
      defaultOpen: false,
      type: 'trigger',
      children: [
        {
          label: 'General',
          to: '/settings',
          exact: true,
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: 'Notificaciones',
          to: '/settings/notifications',
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: 'Seguridad',
          to: '/settings/security',
          onSelect: () => {
            open.value = false
          },
        },
      ],
    },
  ],
] satisfies NavigationMenuItem[][]
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
          <span v-if="!collapsed" class="text-xs text-muted">Admin</span>
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
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch />
    <slot />
  </UDashboardGroup>
</template>
