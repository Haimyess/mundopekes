<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()

const fileRef = ref<HTMLInputElement>()

const profileSchema = computed(() =>
  z.object({
    name: z.string().min(2, t('settings.general.profile.errors.tooShort')),
    email: z.string().email(t('settings.general.profile.errors.invalidEmail')),
    username: z.string().min(2, t('settings.general.profile.errors.tooShort')),
    avatar: z.string().optional(),
    bio: z.string().optional(),
  })
)

type ProfileSchema = z.output<typeof profileSchema.value>

const profile = reactive<Partial<ProfileSchema>>({
  name: 'Benjamin Canac',
  email: 'ben@nuxtlabs.com',
  username: 'benjamincanac',
  avatar: undefined,
  bio: undefined,
})
const toast = useToast()
async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  toast.add({
    title: t('settings.general.profile.toastSuccessTitle'),
    description: t('settings.general.profile.toastSuccessDescription'),
    icon: 'i-lucide-check',
    color: 'success',
  })
  console.log(event.data)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement

  if (!input.files?.length) {
    return
  }

  profile.avatar = URL.createObjectURL(input.files[0]!)
}

function onFileClick() {
  fileRef.value?.click()
}
</script>

<template>
  <UForm id="settings" :schema="profileSchema" :state="profile" @submit="onSubmit">
    <UPageCard
      :title="t('settings.general.profile.title')"
      :description="t('settings.general.profile.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        :label="t('settings.general.profile.save')"
        color="neutral"
        type="submit"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="name"
        :label="t('settings.general.profile.nameLabel')"
        :description="t('settings.general.profile.nameDescription')"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profile.name" autocomplete="off" />
      </UFormField>
      <USeparator />
      <UFormField
        name="email"
        :label="t('settings.general.profile.emailLabel')"
        :description="t('settings.general.profile.emailDescription')"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profile.email" type="email" autocomplete="off" />
      </UFormField>
      <USeparator />
      <UFormField
        name="username"
        :label="t('settings.general.profile.usernameLabel')"
        :description="t('settings.general.profile.usernameDescription')"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profile.username" type="username" autocomplete="off" />
      </UFormField>
      <USeparator />
      <UFormField
        name="avatar"
        :label="t('settings.general.profile.avatarLabel')"
        :description="t('settings.general.profile.avatarDescription')"
        class="flex max-sm:flex-col justify-between sm:items-center gap-4"
      >
        <div class="flex flex-wrap items-center gap-3">
          <UAvatar :src="profile.avatar" :alt="profile.name" size="lg" />
          <UButton
            :label="t('settings.general.profile.avatarChoose')"
            color="neutral"
            @click="onFileClick"
          />
          <input
            ref="fileRef"
            type="file"
            class="hidden"
            accept=".jpg, .jpeg, .png, .gif"
            @change="onFileChange"
          />
        </div>
      </UFormField>
      <USeparator />
      <UFormField
        name="bio"
        :label="t('settings.general.profile.bioLabel')"
        :description="t('settings.general.profile.bioDescription')"
        class="flex max-sm:flex-col justify-between items-start gap-4"
        :ui="{ container: 'w-full' }"
      >
        <UTextarea v-model="profile.bio" :rows="5" autoresize class="w-full" />
      </UFormField>
    </UPageCard>
  </UForm>
</template>
