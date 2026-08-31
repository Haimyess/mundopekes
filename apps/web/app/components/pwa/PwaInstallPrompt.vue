<script setup lang="ts">
/**
 * Banner de instalación — vive en layouts/default.vue y fullwidth.vue
 * (mobile web / desktop, NO en layouts/pwa.vue: no tiene sentido
 * ofrecer instalar algo que ya está instalado y corriendo). Reutiliza
 * usePwaMode() como única fuente de verdad de "ya estás en standalone".
 *
 * Android/Chrome: escucha 'beforeinstallprompt' (el navegador decide
 * cuándo la app es instalable) y dispara el prompt nativo al tocar
 * "Instalar". iOS Safari no expone ese evento — ahí se muestra un banner
 * estático con las instrucciones manuales (Compartir → Agregar a inicio),
 * único camino posible en iOS.
 *
 * El descarte se persiste en localStorage — por viewer, no por sesión —
 * para no insistir en cada visita.
 */
const { isStandalone } = usePwaMode()
const { t } = useI18n()

const DISMISS_KEY = 'pwa-install-dismissed'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deferredPrompt = shallowRef<any>(null)
const isIos = ref(false)
const dismissed = ref(true) // arranca oculto hasta confirmar en onMounted (evita flash)

onMounted(() => {
  if (!import.meta.client) return

  dismissed.value = localStorage.getItem(DISMISS_KEY) === 'true'
  isIos.value = /iphone|ipad|ipod/i.test(navigator.userAgent)

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e
  })
})

const canInstall = computed(() => !!deferredPrompt.value)
const visible = computed(
  () => !dismissed.value && !isStandalone.value && (canInstall.value || isIos.value)
)

async function install() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  await deferredPrompt.value.userChoice
  deferredPrompt.value = null
  dismiss()
}

function dismiss() {
  dismissed.value = true
  if (import.meta.client) localStorage.setItem(DISMISS_KEY, 'true')
}
</script>

<template>
  <Transition name="pwa-install-prompt">
    <div v-if="visible" class="pwa-install-prompt" role="complementary">
      <p class="pwa-install-prompt__text">
        {{ canInstall ? t('pwa.install_prompt') : t('pwa.install_prompt_ios') }}
      </p>

      <button v-if="canInstall" type="button" class="pwa-install-prompt__cta" @click="install">
        {{ t('pwa.install_action') }}
      </button>

      <button
        type="button"
        class="pwa-install-prompt__dismiss"
        :aria-label="t('pwa.install_dismiss')"
        @click="dismiss"
      >
        <UIcon name="i-heroicons-x-mark" class="pwa-install-prompt__dismiss-icon" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.pwa-install-prompt {
  position: fixed;
  inset-inline: var(--space-4);
  bottom: calc(var(--safe-area-inset-bottom, 0px) + var(--space-4));
  z-index: var(--z-index-fixed);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border-radius: var(--border-radius-lg);
  background: var(--color-accent-700);
  color: white;
  box-shadow: var(--shadow-lg);
}

.pwa-install-prompt__text {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
}

.pwa-install-prompt__cta {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--border-radius-full);
  background: white;
  color: var(--color-accent-700);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  white-space: nowrap;
}

.pwa-install-prompt__dismiss {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  background: none;
  color: white;
  opacity: 0.8;
  cursor: pointer;
}

.pwa-install-prompt__dismiss-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.pwa-install-prompt-enter-active,
.pwa-install-prompt-leave-active {
  transition:
    transform var(--transition-slow),
    opacity var(--transition-slow);
}

.pwa-install-prompt-enter-from,
.pwa-install-prompt-leave-to {
  transform: translateY(16px);
  opacity: 0;
}
</style>
