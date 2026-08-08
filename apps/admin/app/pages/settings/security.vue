<script setup lang="ts">
import * as z from 'zod'
import type { FormError } from '@nuxt/ui'

const { t } = useI18n()

// ── Password ──────────────────────────────────────────────
const passwordSchema = computed(() =>
  z.object({
    current: z.string().min(8, t('settings.security.password.errors.minLength')),
    new: z.string().min(8, t('settings.security.password.errors.minLength')),
  })
)
type PasswordSchema = z.output<typeof passwordSchema.value>

const password = reactive<Partial<PasswordSchema>>({ current: '', new: '' })

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  if (state.current && state.new && state.current === state.new) {
    return [{ name: 'new', message: t('settings.security.password.errors.samePassword') }]
  }
  return []
}

// ── MFA ───────────────────────────────────────────────────
const supabase = useSupabaseClient()
const toast = useToast()

const mfaStep = ref<'idle' | 'setup' | 'verify' | 'enabled'>('idle')
const qrCode = ref('')
const secret = ref('')
const factorId = ref('')
const verifyCode = ref('')
const loadingMfa = ref(false)
const hasMfa = ref(false)

// Chequear si ya tiene MFA activo al montar
onMounted(async () => {
  const { data } = await supabase.auth.mfa.listFactors()
  hasMfa.value = (data?.totp?.length ?? 0) > 0
  if (hasMfa.value) mfaStep.value = 'enabled'
})

const startMfaSetup = async () => {
  loadingMfa.value = true
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Pekes Admin',
    })
    if (error) throw error

    factorId.value = data.id
    qrCode.value = data.totp.qr_code
    secret.value = data.totp.secret
    mfaStep.value = 'setup'
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    toast.add({
      title: t('settings.security.mfa.toastSetupErrorTitle'),
      description: message,
      color: 'error',
    })
  } finally {
    loadingMfa.value = false
  }
}

const verifyAndActivateMfa = async () => {
  loadingMfa.value = true
  try {
    // Challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factorId.value,
    })
    if (challengeError) throw challengeError

    // Verify
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factorId.value,
      challengeId: challengeData.id,
      code: verifyCode.value,
    })
    if (verifyError) throw verifyError

    hasMfa.value = true
    mfaStep.value = 'enabled'
    toast.add({
      title: t('settings.security.mfa.toastEnabledTitle'),
      description: t('settings.security.mfa.toastEnabledDescription'),
      color: 'success',
      icon: 'i-lucide-shield-check',
    })
  } catch {
    toast.add({
      title: t('settings.security.mfa.toastWrongCodeTitle'),
      description: t('settings.security.mfa.toastWrongCodeDescription'),
      color: 'error',
    })
  } finally {
    loadingMfa.value = false
  }
}

const disableMfa = async () => {
  loadingMfa.value = true
  try {
    const { data } = await supabase.auth.mfa.listFactors()
    const factor = data?.totp?.[0]
    if (!factor) return

    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (error) throw error

    hasMfa.value = false
    mfaStep.value = 'idle'
    toast.add({
      title: t('settings.security.mfa.toastDisabledTitle'),
      description: t('settings.security.mfa.toastDisabledDescription'),
      color: 'warning',
      icon: 'i-lucide-shield-off',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    toast.add({
      title: t('settings.security.mfa.toastDisableErrorTitle'),
      description: message,
      color: 'error',
    })
  } finally {
    loadingMfa.value = false
  }
}
</script>

<template>
  <!-- Password -->
  <UPageCard
    :title="t('settings.security.password.title')"
    :description="t('settings.security.password.description')"
    variant="subtle"
  >
    <UForm
      :schema="passwordSchema"
      :state="password"
      :validate="validate"
      class="flex flex-col gap-4 max-w-xs"
    >
      <UFormField name="current">
        <UInput
          v-model="password.current"
          type="password"
          :placeholder="t('settings.security.password.currentPlaceholder')"
          class="w-full"
        />
      </UFormField>
      <UFormField name="new">
        <UInput
          v-model="password.new"
          type="password"
          :placeholder="t('settings.security.password.newPlaceholder')"
          class="w-full"
        />
      </UFormField>
      <UButton :label="t('settings.security.password.updateButton')" class="w-fit" type="submit" />
    </UForm>
  </UPageCard>

  <!-- MFA -->
  <UPageCard
    :title="t('settings.security.mfa.title')"
    :description="t('settings.security.mfa.description')"
    variant="subtle"
  >
    <!-- Idle: no tiene MFA -->
    <div v-if="mfaStep === 'idle'" class="flex flex-col gap-3 max-w-xs">
      <UBadge color="warning" variant="subtle" icon="i-lucide-shield-alert">
        {{ t('settings.security.mfa.notConfigured') }}
      </UBadge>
      <UButton
        icon="i-lucide-shield-plus"
        class="w-fit"
        :loading="loadingMfa"
        @click="startMfaSetup"
      >
        {{ t('settings.security.mfa.activateButton') }}
      </UButton>
    </div>

    <!-- Setup: mostrar QR -->
    <div v-else-if="mfaStep === 'setup'" class="flex flex-col gap-4 max-w-sm">
      <p class="text-sm text-(--ui-text-muted)">
        {{ t('settings.security.mfa.setupInstructions') }}
      </p>
      <div class="bg-white p-3 rounded-lg w-fit">
        <img :src="qrCode" :alt="t('settings.security.mfa.qrAlt')" class="w-40 h-40" />
      </div>
      <p class="text-xs text-(--ui-text-muted)">
        {{ t('settings.security.mfa.manualCodeHint') }}
        <code class="font-mono text-xs bg-(--ui-bg-accented) px-1 py-0.5 rounded">{{
          secret
        }}</code>
      </p>
      <UFormField :label="t('settings.security.mfa.codeLabel')" class="max-w-xs">
        <UInput
          v-model="verifyCode"
          placeholder="123456"
          maxlength="6"
          inputmode="numeric"
          icon="i-lucide-key-round"
          class="w-full"
          @keyup.enter="verifyAndActivateMfa"
        />
      </UFormField>
      <div class="flex gap-2">
        <UButton icon="i-lucide-check" :loading="loadingMfa" @click="verifyAndActivateMfa">
          {{ t('settings.security.mfa.confirmButton') }}
        </UButton>
        <UButton variant="ghost" @click="mfaStep = 'idle'">
          {{ t('settings.security.mfa.cancelButton') }}
        </UButton>
      </div>
    </div>

    <!-- Enabled: MFA activo -->
    <div v-else-if="mfaStep === 'enabled'" class="flex flex-col gap-3 max-w-xs">
      <UBadge color="success" variant="subtle" icon="i-lucide-shield-check">
        {{ t('settings.security.mfa.enabledBadge') }}
      </UBadge>
      <UButton
        color="error"
        variant="ghost"
        icon="i-lucide-shield-off"
        class="w-fit"
        :loading="loadingMfa"
        @click="disableMfa"
      >
        {{ t('settings.security.mfa.deactivateButton') }}
      </UButton>
    </div>
  </UPageCard>

  <!-- Danger zone -->
  <UPageCard
    :title="t('settings.security.account.title')"
    :description="t('settings.security.account.description')"
    class="bg-gradient-to-tl from-error/10 from-5% to-default"
  >
    <template #footer>
      <UButton :label="t('settings.security.account.deleteButton')" color="error" />
    </template>
  </UPageCard>
</template>
