<script setup lang="ts">
import type { ContactRequest } from '~/composables/useContactRequests'

interface Props {
  request: ContactRequest | null
}

defineProps<Props>()
const open = defineModel<boolean>('open', { default: false })

const { t, locale } = useI18n()

const intentEmoji: Record<string, string> = {
  outdated_activity: '🐛',
  feedback: '💬',
  provider_inquiry: '🏢',
  other: '💡',
}

const intentLabel = (i: string) => {
  const text = (
    {
      outdated_activity: t('contactRequests.intent.outdated'),
      feedback: t('contactRequests.intent.feedback'),
      provider_inquiry: t('contactRequests.intent.provider'),
      other: t('contactRequests.intent.other'),
    } as Record<string, string>
  )[i]
  if (!text) return t('contactRequests.slideover.defaultTitle')
  return `${intentEmoji[i] ?? ''} ${text}`
}

const statusColor = (s: string) =>
  ({
    pending: 'warning' as const,
    read: 'info' as const,
    resolved: 'success' as const,
  })[s] ?? 'neutral'

const statusLabel = (s: string) =>
  ({
    pending: t('contactRequests.status.pending'),
    read: t('contactRequests.status.read'),
    resolved: t('contactRequests.status.resolved'),
  })[s] ?? s

const formatDate = (date: string) => {
  const d = new Date(date)
  return d.toLocaleString(locale.value === 'en' ? 'en-US' : 'es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="request ? intentLabel(request.intent) : t('contactRequests.slideover.defaultTitle')"
  >
    <template #body>
      <div v-if="request" class="flex flex-col gap-5 p-1">
        <div class="flex items-center gap-3">
          <UBadge :color="statusColor(request.status)" variant="subtle">
            {{ statusLabel(request.status) }}
          </UBadge>
          <span class="text-xs text-(--ui-text-muted) ml-auto">{{
            formatDate(request.created_at)
          }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">{{
            t('contactRequests.columns.contact')
          }}</span>
          <span class="font-medium">{{ request.name }}</span>
          <span class="text-sm text-(--ui-text-muted)">{{ request.email }}</span>
        </div>

        <div v-if="request.activity_title" class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">{{
            t('contactRequests.columns.activity')
          }}</span>
          <span class="text-sm">{{ request.activity_title }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">{{
            t('contactRequests.columns.message')
          }}</span>
          <p class="text-sm leading-relaxed whitespace-pre-wrap">
            {{ request.message }}
          </p>
        </div>
      </div>
    </template>
  </USlideover>
</template>
