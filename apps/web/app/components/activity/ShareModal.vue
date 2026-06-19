<script setup lang="ts">
/**
 * ActivityShareModal — self-contained share trigger + panel.
 *
 * Mobile  → button opens a UDrawer (bottom sheet)
 * Desktop → button opens a UPopover (floating card, estilo GitHub clone)
 *
 * No external v-model needed: the component owns its open state.
 */

interface Props {
  title: string
  url: string
}

const props = defineProps<Props>()
const { t } = useI18n()

// Reactive breakpoint — auto-updates on resize (VueUse, auto-imported)
const isDesktop = useMediaQuery('(min-width: 768px)')

const drawerOpen = ref(false)
const copied = ref(false)

const displayUrl = computed(() => {
  try {
    const u = new URL(props.url)
    return u.hostname + u.pathname
  } catch {
    return props.url
  }
})

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    /* clipboard not available */
  }
}

const facebookUrl = computed(
  () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(props.url)}`
)

const whatsappUrl = computed(
  () => `https://wa.me/?text=${encodeURIComponent(props.title + '\n' + props.url)}`
)
</script>

<template>
  <!-- ═══════════════════════════════════════════════════
       DESKTOP: UPopover (floating card, estilo GitHub)
  ════════════════════════════════════════════════════ -->
  <UPopover v-if="isDesktop" :content="{ side: 'bottom', align: 'end' }">
    <button class="share-trigger">
      <UIcon name="i-heroicons-share" class="share-trigger__icon" />
      {{ t('common.share') }}
    </button>

    <template #content>
      <div class="share-pop">
        <!-- Header -->
        <div class="share-pop__header">
          <span class="share-pop__brand">
            <span class="share-pop__brand-dot" />
            MundoPekes
          </span>
          <p class="share-pop__activity">{{ title }}</p>
        </div>

        <!-- URL + Copy (estilo campo de código de GitHub) -->
        <div class="share-pop__url-row">
          <code class="share-pop__url-code">{{ displayUrl }}</code>
          <button
            class="share-pop__copy-btn"
            :class="{ 'share-pop__copy-btn--done': copied }"
            @click="copyUrl"
          >
            <UIcon
              :name="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
              class="share-pop__copy-icon"
            />
            {{ copied ? t('common.copied') : t('common.copy_link') }}
          </button>
        </div>

        <!-- Social buttons -->
        <div class="share-pop__socials">
          <a
            :href="facebookUrl"
            target="_blank"
            rel="noopener"
            class="share-pop__social share-pop__social--fb"
          >
            <svg class="share-pop__social-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
              />
            </svg>
            Facebook
          </a>
          <a
            :href="whatsappUrl"
            target="_blank"
            rel="noopener"
            class="share-pop__social share-pop__social--wa"
          >
            <svg class="share-pop__social-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
              />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>
    </template>
  </UPopover>

  <!-- ═══════════════════════════════════════════════════
       MOBILE: button → UDrawer (bottom sheet)
  ════════════════════════════════════════════════════ -->
  <template v-else>
    <button class="share-trigger" @click="drawerOpen = true">
      <UIcon name="i-heroicons-share" class="share-trigger__icon" />
      {{ t('common.share') }}
    </button>

    <UDrawer v-model:open="drawerOpen" direction="bottom">
      <template #content>
        <div class="share-sheet">
          <!-- Header -->
          <div class="share-sheet__header">
            <div class="share-sheet__brand">
              <span class="share-sheet__brand-dot" />
              MundoPekes
            </div>
            <button class="share-sheet__close" @click="drawerOpen = false">
              <UIcon name="i-heroicons-x-mark" class="share-sheet__close-icon" />
            </button>
          </div>

          <p class="share-sheet__activity-title">{{ title }}</p>

          <!-- URL + Copiar -->
          <div class="share-sheet__url-row">
            <span class="share-sheet__url-text">{{ displayUrl }}</span>
            <button
              class="share-sheet__copy-btn"
              :class="{ 'share-sheet__copy-btn--done': copied }"
              @click="copyUrl"
            >
              <UIcon
                :name="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
                class="share-sheet__copy-icon"
              />
              {{ copied ? t('common.copied') : t('common.copy_link') }}
            </button>
          </div>

          <!-- Sociales -->
          <div class="share-sheet__socials">
            <a
              :href="facebookUrl"
              target="_blank"
              rel="noopener"
              class="share-social share-social--fb"
              @click="drawerOpen = false"
            >
              <svg class="share-social__icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                />
              </svg>
              Facebook
            </a>
            <a
              :href="whatsappUrl"
              target="_blank"
              rel="noopener"
              class="share-social share-social--wa"
              @click="drawerOpen = false"
            >
              <svg class="share-social__icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                />
              </svg>
              WhatsApp
            </a>
          </div>
        </div>
      </template>
    </UDrawer>
  </template>
</template>

<style scoped>
/* ── Trigger button (compartido mobile/desktop) ─────────────── */
.share-trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--green);
  background: none;
  border: 1.5px solid var(--green-300, #86efac);
  border-radius: 9999px;
  padding: var(--space-1-5, 0.375rem) var(--space-3);
  cursor: pointer;
  transition: background 0.15s;
}

.share-trigger:hover {
  background: var(--color-secondary-50, #f0fdf4);
}

.share-trigger__icon {
  width: 0.875rem;
  height: 0.875rem;
}

/* ══════════════════════════════════════════════════════════════
   DESKTOP POPOVER
════════════════════════════════════════════════════════════ */
.share-pop {
  width: 18rem; /* ~288px */
  display: flex;
  flex-direction: column;
}

/* Header ---------------------------------------------------- */
.share-pop__header {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-neutral-100, #f5f5f5);
}

.share-pop__brand {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-secondary-700, #15803d);
  margin-bottom: var(--space-1);
}

.share-pop__brand-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-secondary-500, #22c55e);
  flex-shrink: 0;
}

.share-pop__activity {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary, #525252);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* URL + copy ------------------------------------------------- */
.share-pop__url-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-neutral-100, #f5f5f5);
  background: var(--color-neutral-50, #fafafa);
}

.share-pop__url-code {
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
  font-size: 0.7rem;
  color: var(--color-text-secondary, #525252);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.share-pop__copy-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-secondary-700, #15803d);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  padding: 0;
  flex-shrink: 0;
  transition: color 0.15s;
}

.share-pop__copy-btn--done {
  color: var(--color-secondary-600, #16a34a);
}

.share-pop__copy-icon {
  width: 0.75rem;
  height: 0.75rem;
}

/* Social buttons -------------------------------------------- */
.share-pop__socials {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
}

.share-pop__social {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1-5);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--border-radius-md, 0.5rem);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  transition: opacity 0.15s;
}

.share-pop__social:hover {
  opacity: 0.88;
}

.share-pop__social-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
}

.share-pop__social--fb {
  background: #1877f2;
  color: #fff;
}

.share-pop__social--wa {
  background: #25d366;
  color: #fff;
}

/* ══════════════════════════════════════════════════════════════
   MOBILE DRAWER (bottom sheet)
════════════════════════════════════════════════════════════ */
.share-sheet {
  padding: var(--space-6, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 1rem);
  padding-bottom: max(var(--space-8, 2rem), env(safe-area-inset-bottom));
}

.share-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.share-sheet__brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-secondary-700, #15803d);
  font-family: var(--font-family-display);
}

.share-sheet__brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-secondary-500, #22c55e);
  flex-shrink: 0;
}

.share-sheet__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--color-neutral-100, #f5f5f5);
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: background 0.15s;
}

.share-sheet__close:hover {
  background: var(--color-neutral-200, #e5e5e5);
}

.share-sheet__close-icon {
  width: 1rem;
  height: 1rem;
}

.share-sheet__activity-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.4;
}

.share-sheet__url-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  background: var(--color-neutral-50, #fafafa);
  border: 1px solid var(--color-neutral-200, #e5e5e5);
  border-radius: var(--border-radius-lg, 0.75rem);
  padding: var(--space-3) var(--space-4);
}

.share-sheet__url-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary, #737373);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.share-sheet__copy-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5, 0.375rem);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-secondary-700, #15803d);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  padding: 0;
  flex-shrink: 0;
  transition: color 0.15s;
}

.share-sheet__copy-btn--done {
  color: var(--color-secondary-600, #16a34a);
}

.share-sheet__copy-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.share-sheet__socials {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.share-social {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--border-radius-lg, 0.75rem);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  transition: opacity 0.15s;
}

.share-social:hover {
  opacity: 0.88;
}

.share-social__icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.share-social--fb {
  background: #1877f2;
  color: #fff;
}

.share-social--wa {
  background: #25d366;
  color: #fff;
}
</style>
