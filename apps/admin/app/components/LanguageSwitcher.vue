<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{ collapsed?: boolean }>()

const { locale, locales, setLocale, t } = useI18n()

const availableLocales = computed(() => locales.value as { code: 'es' | 'en'; name?: string }[])

const currentLocale = computed(() => availableLocales.value.find((l) => l.code === locale.value))

const items = computed<DropdownMenuItem[][]>(() => [
  availableLocales.value.map((l) => ({
    label: l.name ?? l.code,
    checked: l.code === locale.value,
    type: 'checkbox' as const,
    onSelect: () => setLocale(l.code),
  })),
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      icon="i-lucide-globe"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      :label="collapsed ? undefined : (currentLocale?.name ?? t('language.label'))"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      class="data-[state=open]:bg-elevated"
      :ui="{ trailingIcon: 'text-dimmed' }"
    />
  </UDropdownMenu>
</template>
