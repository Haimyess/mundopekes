<script setup lang="ts">
import { format } from 'date-fns'
import type { Mail } from '~/types'

defineProps<{
  mail: Mail
}>()

const emits = defineEmits(['close'])

const { t } = useI18n()

const dropdownItems = computed(() => [
  [
    {
      label: t('inbox.dropdown.markUnread'),
      icon: 'i-lucide-check-circle',
    },
    {
      label: t('inbox.dropdown.markImportant'),
      icon: 'i-lucide-triangle-alert',
    },
  ],
  [
    {
      label: t('inbox.dropdown.starThread'),
      icon: 'i-lucide-star',
    },
    {
      label: t('inbox.dropdown.muteThread'),
      icon: 'i-lucide-circle-pause',
    },
  ],
])

const toast = useToast()

const reply = ref('')
const loading = ref(false)

function onSubmit() {
  loading.value = true

  setTimeout(() => {
    reply.value = ''

    toast.add({
      title: t('inbox.toast.sentTitle'),
      description: t('inbox.toast.sentDescription'),
      icon: 'i-lucide-check-circle',
      color: 'success',
    })

    loading.value = false
  }, 1000)
}
</script>

<template>
  <UDashboardPanel id="inbox-2">
    <UDashboardNavbar :title="mail.subject" :toggle="false">
      <template #leading>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          class="-ms-1.5"
          @click="emits('close')"
        />
      </template>

      <template #right>
        <UTooltip :text="t('inbox.tooltip.archive')">
          <UButton icon="i-lucide-inbox" color="neutral" variant="ghost" />
        </UTooltip>

        <UTooltip :text="t('inbox.tooltip.reply')">
          <UButton icon="i-lucide-reply" color="neutral" variant="ghost" />
        </UTooltip>

        <UDropdownMenu :items="dropdownItems">
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" />
        </UDropdownMenu>
      </template>
    </UDashboardNavbar>

    <div
      class="flex flex-col sm:flex-row justify-between gap-1 p-4 sm:px-6 border-b border-default"
    >
      <div class="flex items-start gap-4 sm:my-1.5">
        <UAvatar v-bind="mail.from.avatar" :alt="mail.from.name" size="3xl" />

        <div class="min-w-0">
          <p class="font-semibold text-highlighted">
            {{ mail.from.name }}
          </p>
          <p class="text-muted">
            {{ mail.from.email }}
          </p>
        </div>
      </div>

      <p class="max-sm:pl-16 text-muted text-sm sm:mt-2">
        {{ format(new Date(mail.date), 'dd MMM HH:mm') }}
      </p>
    </div>

    <div class="flex-1 p-4 sm:p-6 overflow-y-auto">
      <p class="whitespace-pre-wrap">
        {{ mail.body }}
      </p>
    </div>

    <div class="pb-4 px-4 sm:px-6 shrink-0">
      <UCard
        variant="subtle"
        class="mt-auto"
        :ui="{ header: 'flex items-center gap-1.5 text-dimmed' }"
      >
        <template #header>
          <UIcon name="i-lucide-reply" class="size-5" />

          <span class="text-sm truncate">
            {{ t('inbox.replyTo', { name: mail.from.name, email: mail.from.email }) }}
          </span>
        </template>

        <form @submit.prevent="onSubmit">
          <UTextarea
            v-model="reply"
            color="neutral"
            variant="none"
            required
            autoresize
            :placeholder="t('inbox.replyPlaceholder')"
            :rows="4"
            :disabled="loading"
            class="w-full"
            :ui="{ base: 'p-0 resize-none' }"
          />

          <div class="flex items-center justify-between">
            <UTooltip :text="t('inbox.tooltip.attachFile')">
              <UButton color="neutral" variant="ghost" icon="i-lucide-paperclip" />
            </UTooltip>

            <div class="flex items-center justify-end gap-2">
              <UButton color="neutral" variant="ghost" :label="t('inbox.saveDraft')" />
              <UButton
                type="submit"
                color="neutral"
                :loading="loading"
                :label="t('inbox.send')"
                icon="i-lucide-send"
              />
            </div>
          </div>
        </form>
      </UCard>
    </div>
  </UDashboardPanel>
</template>
