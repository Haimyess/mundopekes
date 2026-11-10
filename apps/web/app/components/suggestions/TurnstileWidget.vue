<script setup lang="ts">
interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const SCRIPT_ID = 'cf-turnstile-script'

const emit = defineEmits<{ verify: [token: string]; expire: []; fail: [] }>()

const { t, locale } = useI18n()
const siteKey = useRuntimeConfig().public.turnstileSiteKey as string | undefined
const container = useTemplateRef<HTMLDivElement>('container')
const hasLoadError = ref(false)
let widgetId: string | null = null

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')
    script.addEventListener('load', () => (window.turnstile ? resolve(window.turnstile) : reject()))
    script.addEventListener('error', () => reject())
    if (!existing) {
      script.id = SCRIPT_ID
      script.src = SCRIPT_URL
      script.async = true
      document.head.append(script)
    }
  })
}

function reset() {
  if (widgetId && window.turnstile) window.turnstile.reset(widgetId)
}

onMounted(async () => {
  if (!siteKey || !container.value) return
  try {
    const turnstile = await loadScript()
    widgetId = turnstile.render(container.value, {
      sitekey: siteKey,
      language: locale.value,
      callback: (token: string) => emit('verify', token),
      'expired-callback': () => emit('expire'),
      'error-callback': () => emit('fail'),
    })
  } catch {
    hasLoadError.value = true
    emit('fail')
  }
})

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
})

defineExpose({ reset })
</script>

<template>
  <div class="turnstile-widget">
    <div v-if="siteKey" ref="container" />
    <p v-if="!siteKey || hasLoadError" class="turnstile-widget__error" role="alert">
      {{ t('quickSuggestion.verificationUnavailable') }}
    </p>
  </div>
</template>

<style scoped>
.turnstile-widget {
  min-block-size: 65px;
}

.turnstile-widget__error {
  margin: 0;
  color: var(--mp-coral-700);
  font-size: var(--mp-fs-label-sm);
}
</style>
