<script setup lang="ts">
// Editor de un campo i18n (Record<locale,string>) con tabs por idioma y un punto
// naranja cuando el idioma está vacío. Reutilizado en los drawers de actividad,
// lugar y sugerencia del admin.
//
// `status` (opcional) es el FieldI18nStatus de ese campo (suggestions.i18n_status,
// places.i18n_status, activities.i18n_status — ver layers/domain/types/i18n-status.ts).
// Cuando se pasa, cada tab no-vacío muestra un punto de color según cómo llegó
// ese texto: gris = traducido automático (DeepL), rojo = la última traducción
// automática falló, sin punto = manual (el caso normal, no hace falta marcarlo).
import type { FieldI18nStatus, LocaleStatusEntry } from '../../../domain/types/i18n-status'

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
    status?: FieldI18nStatus
  }>(),
  {
    type: 'input',
    rows: 3,
    required: false,
    locales: () => localeMeta.map((l) => ({ key: l.code, label: l.name })),
    status: undefined,
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

// 'auto' → traducido por DeepL, 'error' → la última traducción falló (texto
// anterior se conserva), 'manual' → escrito/editado a mano, null → sin dato
// (fila anterior a la migración de i18n_status, o campo sin traducción aún).
const translationState = (key: string): LocaleStatusEntry['status'] | null => {
  const entry = props.status?.[key]
  if (!entry || typeof entry === 'string') return null
  return entry.status
}

const statusDotClass = (key: string): string | null => {
  const state = translationState(key)
  if (state === 'error') return 'bg-red-500'
  if (state === 'auto') return 'bg-(--ui-text-muted)'
  return null // 'manual' or unknown — no dot, that's the expected quiet state
}

const statusTitle = (key: string): string | undefined => {
  const state = translationState(key)
  if (state === 'error') return 'La traducción automática falló — se conservó el texto anterior'
  if (state === 'auto') return 'Traducido automáticamente'
  return undefined
}
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
          <span
            v-else-if="statusDotClass(item.value)"
            :class="['w-2 h-2 rounded-full inline-block', statusDotClass(item.value)]"
            :title="statusTitle(item.value)"
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
