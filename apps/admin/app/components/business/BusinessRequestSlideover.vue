<script setup lang="ts">
import { BUSINESS_REQUEST_STATUSES, type BusinessRequestStatus } from '@mundopekes/schemas'
import type { BusinessRequestRow } from '~/composables/useBusinessRequests'

interface Props {
  request: BusinessRequestRow | null
  isSaving: boolean
}

const props = defineProps<Props>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ save: [id: string, status: BusinessRequestStatus, notes: string] }>()

const { t, locale } = useI18n()

const draftStatus = ref<BusinessRequestStatus>('pending')
const draftNotes = ref('')

watch(
  () => props.request,
  (request) => {
    draftStatus.value = (request?.status as BusinessRequestStatus | undefined) ?? 'pending'
    draftNotes.value = request?.notes ?? ''
  },
  { immediate: true }
)

const statusOptions = computed(() =>
  BUSINESS_REQUEST_STATUSES.map((value) => ({
    value,
    label: t(`businessRequests.status.${value}`),
  }))
)

const details = computed(() => {
  const request = props.request
  if (!request) return []
  return [
    { key: 'business', value: request.business_name },
    { key: 'activityType', value: request.activity_type },
    { key: 'city', value: request.city },
    { key: 'contactName', value: request.contact_name },
    { key: 'role', value: request.role ? t(`businessRequests.roles.${request.role}`) : null },
    { key: 'locale', value: request.locale.toUpperCase() },
  ].filter((detail) => detail.value)
})

const phoneHref = computed(() =>
  props.request ? `tel:${props.request.phone.replace(/[^\d+]/g, '')}` : undefined
)

const formatDate = (value: string) =>
  new Date(value).toLocaleString(locale.value === 'en' ? 'en-US' : 'es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

const handleSave = () => {
  if (props.request) emit('save', props.request.id, draftStatus.value, draftNotes.value)
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="request ? t(`businessRequests.kinds.${request.kind}`) : t('businessRequests.title')"
  >
    <template #body>
      <div v-if="request" class="flex flex-col gap-5 p-1">
        <div class="flex items-center gap-3">
          <UBadge :color="request.kind === 'claim' ? 'info' : 'primary'" variant="subtle">
            {{ t(`businessRequests.kinds.${request.kind}`) }}
          </UBadge>
          <span class="text-xs text-(--ui-text-muted) ms-auto">
            {{ formatDate(request.created_at) }}
          </span>
        </div>

        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <template v-for="detail in details" :key="detail.key">
            <dt class="text-(--ui-text-muted)">{{ t(`businessRequests.fields.${detail.key}`) }}</dt>
            <dd>{{ detail.value }}</dd>
          </template>
          <dt class="text-(--ui-text-muted)">{{ t('businessRequests.fields.phone') }}</dt>
          <dd>
            <a :href="phoneHref" class="text-(--ui-primary) underline" dir="ltr">
              {{ request.phone }}
            </a>
          </dd>
          <template v-if="request.email">
            <dt class="text-(--ui-text-muted)">{{ t('businessRequests.fields.email') }}</dt>
            <dd>
              <a :href="`mailto:${request.email}`" class="text-(--ui-primary) underline">
                {{ request.email }}
              </a>
            </dd>
          </template>
        </dl>

        <UButton
          v-if="request.place_id"
          :to="`/places/${request.place_id}`"
          color="neutral"
          variant="outline"
          icon="i-lucide-map-pin"
          class="self-start"
        >
          {{ t('businessRequests.openPlace') }}
        </UButton>

        <UFormField :label="t('businessRequests.fields.status')" name="status">
          <USelect v-model="draftStatus" :items="statusOptions" class="w-full" />
        </UFormField>
        <UFormField :label="t('businessRequests.fields.notes')" name="notes">
          <UTextarea v-model="draftNotes" :rows="4" :maxlength="2000" autoresize class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <UButton
        color="primary"
        icon="i-lucide-save"
        :loading="isSaving"
        :disabled="!request"
        @click="handleSave"
      >
        {{ t('businessRequests.save') }}
      </UButton>
    </template>
  </USlideover>
</template>
