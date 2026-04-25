<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()
const { isMobile } = useResponsive()

const drawerOpen = ref(false)

const availableLocales = computed(() =>
  (locales.value as { code: string; name?: string }[]).map((l) => ({
    code: l.code,
    name: l.name ?? l.code,
    label: l.code.toUpperCase(),
  }))
)

const currentLabel = computed(() => locale.value.toUpperCase())

async function selectLocale(code: string) {
  await setLocale(code as 'es' | 'en' | 'ru' | 'he')
  drawerOpen.value = false
}
</script>

<template>
  <ClientOnly>
    <!-- Desktop: DropdownMenu -->
    <UDropdownMenu
      v-if="!isMobile"
      :items="
        availableLocales.map((l) => ({
          label: l.name,
          onSelect: () => selectLocale(l.code),
        }))
      "
    >
      <UButton color="neutral" variant="ghost" size="sm">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
          <span class="text-sm font-medium">{{ currentLabel }}</span>
        </div>
      </UButton>
    </UDropdownMenu>

    <!-- Mobile: Drawer con v-model:open -->
    <UDrawer
      v-else
      v-model:open="drawerOpen"
      direction="bottom"
      :handle="true"
      :ui="{ content: 'max-h-[40vh]', body: 'p-0' }"
    >
      <UButton color="neutral" variant="ghost" size="sm" @click="drawerOpen = true">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-globe-alt" class="w-5 h-5" />
          <span class="text-base font-medium">{{ currentLabel }}</span>
        </div>
      </UButton>

      <template #body>
        <div class="overflow-y-auto">
          <button
            v-for="l in availableLocales"
            :key="l.code"
            class="flex items-center gap-3 w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left"
            :class="{ 'text-primary-600': l.code === locale }"
            @click="selectLocale(l.code)"
          >
            <span
              class="text-xs font-bold w-7 text-center rounded px-1 py-0.5 shrink-0"
              :class="
                l.code === locale ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
              "
            >
              {{ l.label }}
            </span>
            <span class="text-sm font-medium">{{ l.name }}</span>
            <UIcon
              v-if="l.code === locale"
              name="i-heroicons-check"
              class="ml-auto w-4 h-4 text-primary-600"
            />
          </button>
        </div>
      </template>
    </UDrawer>

    <template #fallback>
      <UButton color="neutral" variant="ghost" size="sm">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-heroicons-globe-alt" class="w-5 h-5" />
          <span class="text-base font-medium">{{ currentLabel }}</span>
        </div>
      </UButton>
    </template>
  </ClientOnly>
</template>
