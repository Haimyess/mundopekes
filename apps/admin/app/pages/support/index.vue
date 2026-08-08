<!-- app/pages/support/index.vue -->
<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('support.helpDesk.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <div class="flex items-center justify-center h-full py-24 text-muted text-sm">
      {{ t('support.helpDesk.comingSoon') }}
    </div>
  </UDashboardPanel>
</template>
