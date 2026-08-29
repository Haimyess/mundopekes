<script setup lang="ts">
// Editor de un campo i18n (Record<locale,string>) con tabs por idioma y un punto
// naranja cuando el idioma está vacío. Reutilizado en los drawers de actividad,
// lugar y sugerencia del admin.

interface LocaleItem {
  key: string
  label: string
}

const { localeMeta } = useContentLocales()

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, string>
    type?: 'input' | 'textarea'
    rows?: number
    label?: string
    placeholder?: string
    required?: boolean
    locales?: LocaleItem[]
  }>(),
  {
    type: 'input',
    rows: 3,
    required: false,
    locales: () => localeMeta.map((l) => ({ key: l.code, label: l.name })),
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
}>()

const activeLocale = ref(props.locales[0]?.key ?? 'es')

const activeLabel = computed(
  () => props.locales.find((l) => l.key === activeLocale.value)?.label ?? activeLocale.value
)

const tabItems = computed(() => props.locales.map((l) => ({ label: l.label, value: l.key })))

// v-model proxy para el locale activo
const currentValue = computed<string>({
  get: () => props.modelValue?.[activeLocale.value] ?? '',
  set: (val: string) => {
    emit('update:modelValue', { ...props.modelValue, [activeLocale.value]: val })
  },
})

const isMissing = (key: string) => !props.modelValue?.[key]?.trim()
</script>

<template>
  <UFormField :label="label" :required="required">
    <UTabs v-model="activeLocale" :items="tabItems" class="w-full">
      <template #default="{ item }">
        <span class="flex items-center gap-1">
          {{ item.label }}
          <span
            v-if="isMissing(item.value)"
            class="w-2 h-2 rounded-full bg-orange-400 inline-block"
          />
        </span>
      </template>
    </UTabs>

    <UTextarea
      v-if="type === 'textarea'"
      v-model="currentValue"
      :rows="rows"
      :placeholder="placeholder ?? `${label ?? ''} en ${activeLabel}`"
      class="w-full mt-2"
    />
    <UInput
      v-else
      v-model="currentValue"
      :placeholder="placeholder ?? `${label ?? ''} en ${activeLabel}`"
      class="w-full mt-2"
    />
  </UFormField>
</template>
