<script setup lang="ts">
// Editor de un campo i18n (Record<locale,string>) — sin tabs, sin acordeón
// (probamos ambos, Haim los sacó: se veían mal/desordenados y el segundo
// ocultaba idiomas ya traducidos detrás de un popover de sólo lectura, sin
// dejar editarlos). Diseño actual: se muestra un único input por default, el
// del idioma de interfaz del admin (`uiLocale`, es/en) — tenga o no contenido
// todavía. Un botón "Ver más idiomas" revela el resto (editables, tengan o no
// contenido) — no un preview de sólo lectura.
//
// Al perder el foco de cualquier input se llama a POST /api/i18n/translate-field
// con su locale (siempre conocido: es el del input, sea el default o uno
// expandido) — el server corre translateI18nField, el mismo que ya se usaba
// al guardar la entidad (protege locales marcados 'manual', traduce el
// resto a partir de ESE input, sin importar cuál sea) — sólo que ahora se ve
// en vivo mientras el drawer sigue abierto.
//
// `status` (opcional) es el FieldI18nStatus de ese campo (suggestions.i18n_status,
// places.i18n_status, activities.i18n_status — ver layers/domain/types/i18n-status.ts).
// El componente emite `update:status` con el resultado de cada traducción en
// vivo — el caller lo debe guardar y mandarlo de vuelta al servidor al hacer
// Guardar (ver EntityFormFields.vue y los 3 drawers), porque el servidor ya
// no puede reconstruirlo comparando contra la DB (el blur tradujo antes de
// que el guardado llegue, así que todo aparece "cambiado").
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
  showMore: string
  hideEmpty: string
  autoTranslated: string
  translationFailed: string
  manualLocked: string
}

const DEFAULT_LABELS: I18nFieldLabels = {
  hint: 'Type in any language — the rest fills in on its own',
  showMore: 'Show more languages',
  hideEmpty: 'Hide languages',
  autoTranslated: 'Automatically translated',
  translationFailed: 'Automatic translation failed — the previous text was kept',
  manualLocked: 'Protected — this language was edited by hand and is not auto-updated',
}

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, string>
    type?: 'input' | 'textarea'
    rows?: number
    label?: string
    required?: boolean
    locales?: LocaleItem[]
    status?: FieldI18nStatus
    labels?: I18nFieldLabels
    // Idioma de interfaz del admin (es/en) — decide qué input se muestra por
    // default, colapsado. No confundir con `locales` (los idiomas de
    // CONTENIDO que se pueden editar acá).
    uiLocale?: string
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
  'update:status': [value: FieldI18nStatus | undefined]
}>()

const { localeMeta } = useContentLocales()

const resolvedLocales = computed<LocaleItem[]>(
  () => props.locales ?? localeMeta.map((l) => ({ key: l.code, label: l.name }))
)

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

// Locale cuyo POST /api/i18n/translate-field falló por completo (network,
// DeepL sin configurar, etc. — no un target puntual que translateI18nField
// ya marcó 'error') — ver handleBlur. Se limpia en el próximo blur (éxito o
// no) y si el admin vuelve a tocar ese mismo input.
const requestFailedLocale = ref<string | null>(null)

// Mensaje visible debajo del input — no sólo el punto de color — para que
// "no se tradujo" nunca sea silencioso: cubre la traducción de ESTE locale
// como target que falló (status 'error'), el pedido completo que falló
// (requestFailedLocale), y el locale protegido por una edición manual
// anterior en OTRO locale (status 'manual' pero no es el sourceLocale de
// este edit — si lo fuera, 'manual' es simplemente "esto es lo que
// tipeaste", no algo para señalar).
const notTranslatedMessage = (key: string): string | undefined => {
  if (requestFailedLocale.value === key) return t.value.translationFailed
  const state = translationState(key)
  if (state === 'error') return t.value.translationFailed
  if (state === 'manual' && key !== effectiveStatus.value?.sourceLocale) {
    return t.value.manualLocked
  }
  return undefined
}

// Se muestra siempre un único input por default: el del idioma de interfaz
// del admin (uiLocale), tenga o no contenido — "Ver más idiomas" revela el
// resto (también tengan o no contenido, ya no depende de si están vacíos).
const defaultLocale = computed<LocaleItem | undefined>(
  () => resolvedLocales.value.find((l) => l.key === props.uiLocale) ?? resolvedLocales.value[0]
)
const expanded = ref(false)
// Todos los locales salvo el default — constante sin importar `expanded`,
// se usa para decidir si el toggle "ver más/ocultar" tiene sentido y para
// el contador del botón.
const otherLocales = computed<LocaleItem[]>(() =>
  resolvedLocales.value.filter((l) => l.key !== defaultLocale.value?.key)
)
const shownLocales = computed<LocaleItem[]>(() =>
  expanded.value ? resolvedLocales.value : defaultLocale.value ? [defaultLocale.value] : []
)
// Un idioma oculto en 'error' no debería perder visibilidad sólo por estar colapsado.
const hiddenHasError = computed(
  () => !expanded.value && otherLocales.value.some((l) => translationState(l.key) === 'error')
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
    expanded.value = false
  }
)

const loadingLocale = ref<string | null>(null)

const handleBlur = async (locale: string) => {
  const text = props.modelValue?.[locale] ?? ''
  if (text === (baseline.value[locale] ?? '')) return
  if (!text.trim()) {
    baseline.value = { ...props.modelValue }
    return
  }

  loadingLocale.value = locale
  requestFailedLocale.value = null
  try {
    const { value, status } = await $fetch<TranslateFieldResponse>('/api/i18n/translate-field', {
      method: 'POST',
      body: { text, locale, previous: baseline.value, priorStatus: effectiveStatus.value },
    })
    emitValue(value)
    liveStatus.value = status
    emit('update:status', status)
    baseline.value = { ...value }
  } catch {
    // Sin traducción automática, al menos no perdemos lo que se tipeó —
    // pero sí se lo avisamos al admin (ver notTranslatedMessage) en vez de
    // fallar en silencio.
    requestFailedLocale.value = locale
    baseline.value = { ...props.modelValue }
  } finally {
    loadingLocale.value = null
  }
}

const setLocaleText = (key: string, value: string) => {
  if (requestFailedLocale.value === key) requestFailedLocale.value = null
  emitValue({ ...props.modelValue, [key]: value })
}
</script>

<template>
  <UFormField :label="label" :required="required">
    <p v-if="!expanded" class="text-xs text-(--ui-text-muted) mb-1">{{ t.hint }}</p>

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
      <p
        v-if="notTranslatedMessage(l.key)"
        :class="[
          'text-xs',
          translationState(l.key) === 'manual' ? 'text-(--ui-text-muted)' : 'text-red-500',
        ]"
      >
        {{ notTranslatedMessage(l.key) }}
      </p>
    </div>

    <div v-if="!expanded && otherLocales.length" class="flex items-center gap-2">
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        trailing-icon="i-lucide-chevron-down"
        @click="expanded = true"
      >
        {{ t.showMore }} ({{ otherLocales.length }})
      </UButton>
      <span
        v-if="hiddenHasError"
        class="w-2 h-2 rounded-full inline-block bg-red-500"
        :title="t.translationFailed"
      />
    </div>
    <UButton
      v-else-if="expanded && otherLocales.length"
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
