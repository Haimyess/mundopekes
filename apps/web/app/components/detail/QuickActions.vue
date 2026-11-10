<script setup lang="ts">
import type { DetailContact } from '#shared/types/detail'

interface Props {
  contact: DetailContact
  targetType: 'activity' | 'place'
  targetId: string
}

const props = defineProps<Props>()

type ActionKey = 'directions' | 'waze' | 'call' | 'whatsapp' | 'website'

interface QuickAction {
  key: ActionKey
  href: string
  icon: string
  isExternal: boolean
}

const ACTION_ICONS: Record<ActionKey, string> = {
  directions: 'i-hugeicons-route-01',
  waze: 'i-hugeicons-navigation-03',
  call: 'i-hugeicons-call',
  whatsapp: 'i-hugeicons-whatsapp',
  website: 'i-hugeicons-globe-02',
}

const { t } = useI18n()
const { trackDirectionsClick } = useTracking()

const actions = computed<QuickAction[]>(() => {
  const { directionsUrl, wazeUrl, phone, whatsappUrl, website } = props.contact
  const candidates: [ActionKey, string | null, boolean][] = [
    ['directions', directionsUrl, true],
    ['waze', wazeUrl, true],
    ['call', phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null, false],
    ['whatsapp', whatsappUrl, true],
    ['website', website, true],
  ]
  return candidates.flatMap(([key, href, isExternal]) =>
    href ? [{ key, href, isExternal, icon: ACTION_ICONS[key] }] : []
  )
})

const handleActionClick = (key: ActionKey) => {
  if (key === 'directions') trackDirectionsClick(props.targetType, props.targetId, 'maps')
  if (key === 'waze') trackDirectionsClick(props.targetType, props.targetId, 'waze')
}
</script>

<template>
  <nav v-if="actions.length" class="quick-actions" :aria-label="t('detail.quickActions')">
    <ul class="quick-actions__list">
      <li v-for="action in actions" :key="action.key">
        <a
          :href="action.href"
          class="quick-actions__link"
          :target="action.isExternal ? '_blank' : undefined"
          :rel="action.isExternal ? 'noopener noreferrer' : undefined"
          @click="handleActionClick(action.key)"
        >
          <span class="quick-actions__icon"><UiIcon :name="action.icon" :size="20" /></span>
          <span class="quick-actions__label">{{ t(`detail.actions.${action.key}`) }}</span>
          <span v-if="action.isExternal" class="quick-actions__hint">{{
            t('detail.opensNewTab')
          }}</span>
        </a>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.quick-actions__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.quick-actions__link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-block-size: var(--mp-tap);
  padding: 10px 4px;
  border-radius: var(--mp-r-card);
  color: var(--mp-ink);
  font-size: var(--mp-fs-label-sm);
  font-weight: var(--mp-fw-medium);
  text-align: center;
  text-decoration: none;
}

.quick-actions__link:hover {
  background: var(--mp-border-soft);
}

.quick-actions__link:focus-visible {
  outline: var(--mp-focus-ring-width) solid var(--mp-focus-ring);
  outline-offset: 2px;
}

.quick-actions__icon {
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
}

.quick-actions__hint {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
