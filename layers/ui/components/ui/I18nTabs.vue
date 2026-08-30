<script setup lang="ts">
// Editor de un campo i18n (Record<locale,string>) — sin tabs, sin acordeón
// (probamos ambos, Haim los sacó: se veían mal/desordenados y el segundo
// ocultaba idiomas ya traducidos detrás de un popover de sólo lectura, sin
// dejar editarlos). Diseño actual: un input por cada locale que YA tiene
// contenido (editable directo, con su etiqueta de idioma arriba); si ningún
// locale tiene contenido todavía (alta nueva) se muestra un único input
// "primario" sin idioma asignado para arrancar a escribir. Un botón "Ver más
// idiomas" revela inputs editables para el resto (vacíos) — no un preview de
// sólo lectura.
//
// Al perder el foco de cualquier input se llama a POST /api/i18n/translate-field:
// - el input primario (sin locale conocido) manda sólo el texto — el server
//   detecta el idioma con DeepL (DeepLProvider.detectLanguage).
// - cualquier input ya identificado (tiene su propio locale) manda ese
//   locale directo, sin detección.
// En ambos casos el server corre después el mismo translateI18nField que ya
// se usaba al guardar la entidad (protege locales marcados 'manual', traduce
// el resto) — sólo que ahora se ve en vivo mientras el drawer sigue abierto.
//
// `status` (opcional) es el FieldI18nStatus de ese campo (suggestions.i18n_status,
// places.i18n_status, activities.i18n_status — ver layers/domain/types/i18n-status.ts).
// Reutilizado en los 3 drawers del admin (actividad/lugar/sugerencia) vía
// EntityFormFields.
import type { FieldI18nStatus, LocaleStatusEntry } from '../../../domain/types/i18n-status'

interface LocaleItem {
  key: string
  label: string
}

// Respuesta de POST /api/i18n/translate-field (apps/admin/server) — no se
// puede importar el tipo del server-only translation-service.ts desde acá
// (este componente vive en layers/ui, alcanzable desde app/), así que se
// repite localmente la forma mínima que se usa.
interface TranslateFieldResponse {
  value: Record<string, string>
  status?: FieldI18nStatus
}

// Copy propio del componente (botones, hints, tooltips de estado) — llega
// por prop igual que el resto de los Ui*, así que respeta el idioma de
// interfaz del admin (es/en) en vez de quedar hardcodeado en un solo idioma.
// Default en inglés sólo como red de seguridad por si algún caller nuevo se
// olvida de pasarlo — los 3 drawers actuales (vía EntityFormFields) siempre
// lo pasan.
interface I18nFieldLabels {
  hint: string
  translateError: string
  missingLanguages: string
  showMore: string
  hideEmpty: string
  autoTranslated: string
  translationFailed: string
}

const DEFAULT_LABELS: I18nFieldLabels = {
  hint: 'Type in any language — the rest fills in on its own',
  translateError: 'Automatic translation failed',
  missingLanguages: 'Missing',
  showMore: 'Show more languages',
  hideEmpty: 'Hide empty languages',
  autoTranslated: 'Automatically translated',
  translationFailed: 'Automatic translation failed — the previous text was kept',
}

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
    labels?: I18nFieldLabels
  }>(),
  {
    type: 'input',
    rows: 3,
    required: false,
  }
)

const t = computed<I18nFieldLabels>(() => props.labels ?? DEFAULT_LABELS)

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
}>()

const { localeMeta } = useContentLocales()

const resolvedLocales = computed<LocaleItem[]>(
  () => props.locales ?? localeMeta.map((l) => ({ key: l.code, label: l.name }))
)

const isMissing = (key: string) => !props.modelValue?.[key]?.trim()

// Refleja el status ya guardado (props.status) hasta que una traducción en
// vivo de esta sesión de edición lo actualice.
const liveStatus = ref<FieldI18nStatus | undefined>(undefined)
const effectiveStatus = computed(() => liveStatus.value ?? props.status)

// 'auto' → traducido por DeepL, 'error' → la última traducción falló (texto
// anterior se conserva), 'manual' → escrito/editado a mano, null → sin dato.
const translationState = (key: string): LocaleStatusEntry['status'] | null => {
  const entry = effectiveStatus.value?.[key]
  if (!entry || typeof entry === 'string') return null
  return entry.status
}

const statusDotClass = (key: string): string | null => {
  const state = translationState(key)
  if (state === 'error') return 'bg-red-500'
  if (state === 'auto') return 'bg-(--ui-text-muted)'
  return null
}

const statusTitle = (key: string): string | undefined => {
  const state = translationState(key)
  if (state === 'error') return t.value.translationFailed
  if (state === 'auto') return t.value.autoTranslated
  return undefined
}

// Se muestran siempre los locales con contenido; si ninguno tiene todavía
// (alta nueva) se usa el input primario en su lugar (ver template).
const filledLocales = computed(() => resolvedLocales.value.filter((l) => !isMissing(l.key)))
const expanded = ref(false)
const shownLocales = computed(() => (expanded.value ? resolvedLocales.value : filledLocales.value))
const hiddenLocales = computed(() =>
  resolvedLocales.value.filter((l) => !filledLocales.value.some((s) => s.key === l.key))
)

// "Baseline": el último estado confirmado con el server (carga inicial o
// última traducción exitosa) — es el `previous` que se manda en la próxima
// llamada, separado de modelValue porque éste cambia en cada tecla.
const baseline = ref<Record<string, string>>({ ...(props.modelValue ?? {}) })
// Referencia al último objeto que este componente emitió — permite
// distinguir "cambié yo modelValue" (round-trip propio, no resetear baseline)
// de "cambió desde afuera" (el drawer pasó a editar otra entidad).
let lastEmitted: Record<string, string> | null = null

const emitValue = (value: Record<string, string>) => {
  lastEmitted = value
  emit('update:modelValue', value)
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (JSON.stringify(newVal ?? {}) === JSON.stringify(lastEmitted)) return
    baseline.value = { ...(newVal ?? {}) }
    liveStatus.value = undefined
  }
)

const loadingLocale = ref<string | null>(null)
const primaryDraft = ref('')
const primaryError = ref(false)

const handleBlur = async (locale: string) => {
  const text = props.modelValue?.[locale] ?? ''
  if (text === (baseline.value[locale] ?? '')) return
  if (!text.trim()) {
    baseline.value = { ...props.modelValue }
    return
  }

  loadingLocale.value = locale
  try {
    const { value, status } = await $fetch<TranslateFieldResponse>('/api/i18n/translate-field', {
      method: 'POST',
      body: { text, locale, previous: baseline.value, priorStatus: effectiveStatus.value },
    })
    emitValue(value)
    liveStatus.value = status
    baseline.value = { ...value }
  } catch {
    // Sin traducción automática, al menos no perdemos lo que se tipeó.
    baseline.value = { ...props.modelValue }
  } finally {
    loadingLocale.value = null
  }
}

const handlePrimaryBlur = async () => {
  const text = primaryDraft.value
  if (!text.trim()) return

  loadingLocale.value = '__primary__'
  primaryError.value = false
  try {
    const { value, status } = await $fetch<TranslateFieldResponse>('/api/i18n/translate-field', {
      method: 'POST',
      body: { text, previous: baseline.value, priorStatus: effectiveStatus.value },
    })
    emitValue(value)
    liveStatus.value = status
    baseline.value = { ...value }
    primaryDraft.value = ''
  } catch {
    primaryError.value = true
    const fallbackLocale = resolvedLocales.value[0]?.key ?? 'es'
    const value = { ...props.modelValue, [fallbackLocale]: text }
    emitValue(value)
    baseline.value = { ...value }
  } finally {
    loadingLocale.value = null
  }
}

const setLocaleText = (key: string, value: string) => {
  emitValue({ ...props.modelValue, [key]: value })
}
</script>

<template>
  <UFormField :label="label" :required="required">
    <template v-if="filledLocales.length === 0">
      <UTextarea
        v-if="type === 'textarea'"
        v-model="primaryDraft"
        :rows="rows"
        :placeholder="placeholder ?? label"
        class="w-full"
        @blur="handlePrimaryBlur"
      />
      <UInput
        v-else
        v-model="primaryDraft"
        :placeholder="placeholder ?? label"
        class="w-full"
        @blur="handlePrimaryBlur"
      />
      <p class="text-xs text-(--ui-text-muted) mt-1 flex items-center gap-1.5">
        <UIcon
          v-if="loadingLocale === '__primary__'"
          name="i-lucide-loader-2"
          class="animate-spin size-3"
        />
        <template v-if="primaryError">{{ t.translateError }}</template>
        <template v-else>{{ t.hint }}</template>
      </p>
    </template>

    <div v-for="l in shownLocales" :key="l.key" class="flex flex-col gap-1 mb-2 last:mb-0">
      <span class="text-xs text-(--ui-text-muted) flex items-center gap-1.5">
        {{ l.label }}
        <UIcon
          v-if="loadingLocale === l.key"
          name="i-lucide-loader-2"
          class="animate-spin size-3"
        />
        <span
          v-else-if="statusDotClass(l.key)"
          :class="['w-2 h-2 rounded-full inline-block', statusDotClass(l.key)]"
          :title="statusTitle(l.key)"
        />
      </span>
      <UTextarea
        v-if="type === 'textarea'"
        :model-value="modelValue?.[l.key] ?? ''"
        :rows="rows"
        class="w-full"
        @update:model-value="(v) => setLocaleText(l.key, String(v ?? ''))"
        @blur="handleBlur(l.key)"
      />
      <UInput
        v-else
        :model-value="modelValue?.[l.key] ?? ''"
        class="w-full"
        @update:model-value="(v) => setLocaleText(l.key, String(v ?? ''))"
        @blur="handleBlur(l.key)"
      />
    </div>

    <div v-if="!expanded && hiddenLocales.length" class="flex flex-col gap-1 items-start">
      <p class="text-xs text-(--ui-text-muted)">
        {{ t.missingLanguages }}: {{ hiddenLocales.map((l) => l.label).join(', ') }}
      </p>
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        trailing-icon="i-lucide-chevron-down"
        @click="expanded = true"
      >
        {{ t.showMore }} ({{ hiddenLocales.length }})
      </UButton>
    </div>
    <UButton
      v-else-if="expanded && hiddenLocales.length"
      size="xs"
      color="neutral"
      variant="ghost"
      trailing-icon="i-lucide-chevron-up"
      class="self-start"
      @click="expanded = false"
    >
      {{ t.hideEmpty }}
    </UButton>
  </UFormField>
</template>
