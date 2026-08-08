<script setup lang="ts">
const { t } = useI18n()

const state = reactive<{ [key: string]: boolean }>({
  email: true,
  desktop: false,
  product_updates: true,
  weekly_digest: false,
  important_updates: true,
})

const sections = computed(() => [
  {
    title: t('settings.notifications.channels.title'),
    description: t('settings.notifications.channels.description'),
    fields: [
      {
        name: 'email',
        label: t('settings.notifications.channels.email.label'),
        description: t('settings.notifications.channels.email.description'),
      },
      {
        name: 'desktop',
        label: t('settings.notifications.channels.desktop.label'),
        description: t('settings.notifications.channels.desktop.description'),
      },
    ],
  },
  {
    title: t('settings.notifications.account.title'),
    description: t('settings.notifications.account.description'),
    fields: [
      {
        name: 'weekly_digest',
        label: t('settings.notifications.account.weeklyDigest.label'),
        description: t('settings.notifications.account.weeklyDigest.description'),
      },
      {
        name: 'product_updates',
        label: t('settings.notifications.account.productUpdates.label'),
        description: t('settings.notifications.account.productUpdates.description'),
      },
      {
        name: 'important_updates',
        label: t('settings.notifications.account.importantUpdates.label'),
        description: t('settings.notifications.account.importantUpdates.description'),
      },
    ],
  },
])

async function onChange() {
  // Do something with data
  console.log(state)
}
</script>

<template>
  <div v-for="(section, index) in sections" :key="index">
    <UPageCard
      :title="section.title"
      :description="section.description"
      variant="naked"
      class="mb-4"
    />

    <UPageCard variant="subtle" :ui="{ container: 'divide-y divide-default' }">
      <UFormField
        v-for="field in section.fields"
        :key="field.name"
        :name="field.name"
        :label="field.label"
        :description="field.description"
        class="flex items-center justify-between not-last:pb-4 gap-2"
      >
        <USwitch v-model="state[field.name]" @update:model-value="onChange" />
      </UFormField>
    </UPageCard>
  </div>
</template>
