<script setup lang="ts">
import type { ContactRequest } from '~/composables/useContactRequests'

interface Props {
  request: ContactRequest | null
}

defineProps<Props>()
const open = defineModel<boolean>('open', { default: false })

const intentLabel: Record<string, string> = {
  outdated_activity: '🐛 Desactualizado',
  feedback: '💬 Feedback',
  provider_inquiry: '🏢 Proveedor',
  other: '💡 Otro',
}

const statusColor = (s: string) =>
  ({
    pending: 'warning' as const,
    read: 'info' as const,
    resolved: 'success' as const,
  })[s] ?? 'neutral'

const statusLabel = (s: string) =>
  ({
    pending: 'Pendiente',
    read: 'Leído',
    resolved: 'Resuelto',
  })[s] ?? s

const formatDate = (date: string) => {
  const d = new Date(date)
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <USlideover v-model:open="open" :title="intentLabel[request?.intent ?? ''] ?? 'Consulta'">
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
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider"
            >Contacto</span
          >
          <span class="font-medium">{{ request.name }}</span>
          <span class="text-sm text-(--ui-text-muted)">{{ request.email }}</span>
        </div>

        <div v-if="request.activity_title" class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider"
            >Actividad</span
          >
          <span class="text-sm">{{ request.activity_title }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider"
            >Mensaje</span
          >
          <p class="text-sm leading-relaxed whitespace-pre-wrap">
            {{ request.message }}
          </p>
        </div>
      </div>
    </template>
  </USlideover>
</template>
