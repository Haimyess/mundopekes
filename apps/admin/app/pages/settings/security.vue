<script setup lang="ts">
import * as z from 'zod'
import type { FormError } from '@nuxt/ui'

// ── Password ──────────────────────────────────────────────
const passwordSchema = z.object({
  current: z.string().min(8, 'Mínimo 8 caracteres'),
  new: z.string().min(8, 'Mínimo 8 caracteres'),
})
type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({ current: '', new: '' })

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  if (state.current && state.new && state.current === state.new) {
    return [{ name: 'new', message: 'La nueva contraseña debe ser diferente' }]
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
  } catch (error: any) {
    toast.add({ title: 'Error al configurar MFA', description: error.message, color: 'error' })
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
      title: 'MFA activado',
      description: 'Tu cuenta ahora requiere verificación en dos pasos',
      color: 'success',
      icon: 'i-lucide-shield-check',
    })
  } catch (error: any) {
    toast.add({
      title: 'Código incorrecto',
      description: 'Verificá el código en tu app autenticadora',
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
      title: 'MFA desactivado',
      description: 'La verificación en dos pasos fue removida',
      color: 'warning',
      icon: 'i-lucide-shield-off',
    })
  } catch (error: any) {
    toast.add({ title: 'Error al desactivar MFA', description: error.message, color: 'error' })
  } finally {
    loadingMfa.value = false
  }
}
</script>

<template>
  <!-- Password -->
  <UPageCard
    title="Contraseña"
    description="Confirmá tu contraseña actual antes de establecer una nueva."
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
          placeholder="Contraseña actual"
          class="w-full"
        />
      </UFormField>
      <UFormField name="new">
        <UInput
          v-model="password.new"
          type="password"
          placeholder="Nueva contraseña"
          class="w-full"
        />
      </UFormField>
      <UButton label="Actualizar" class="w-fit" type="submit" />
    </UForm>
  </UPageCard>

  <!-- MFA -->
  <UPageCard
    title="Verificación en dos pasos (MFA)"
    description="Usá una app como Google Authenticator o Authy para mayor seguridad."
    variant="subtle"
  >
    <!-- Idle: no tiene MFA -->
    <div v-if="mfaStep === 'idle'" class="flex flex-col gap-3 max-w-xs">
      <UBadge color="warning" variant="subtle" icon="i-lucide-shield-alert">
        MFA no configurado
      </UBadge>
      <UButton
        icon="i-lucide-shield-plus"
        class="w-fit"
        :loading="loadingMfa"
        @click="startMfaSetup"
      >
        Activar MFA
      </UButton>
    </div>

    <!-- Setup: mostrar QR -->
    <div v-else-if="mfaStep === 'setup'" class="flex flex-col gap-4 max-w-sm">
      <p class="text-sm text-(--ui-text-muted)">
        Escaneá el código QR con tu app autenticadora, luego ingresá el código de 6 dígitos para
        confirmar.
      </p>
      <div class="bg-white p-3 rounded-lg w-fit">
        <img :src="qrCode" alt="QR MFA" class="w-40 h-40" />
      </div>
      <p class="text-xs text-(--ui-text-muted)">
        ¿No podés escanear? Ingresá este código manualmente:
        <code class="font-mono text-xs bg-(--ui-bg-accented) px-1 py-0.5 rounded">{{
          secret
        }}</code>
      </p>
      <UFormField label="Código de verificación" class="max-w-xs">
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
          Confirmar
        </UButton>
        <UButton variant="ghost" @click="mfaStep = 'idle'"> Cancelar </UButton>
      </div>
    </div>

    <!-- Enabled: MFA activo -->
    <div v-else-if="mfaStep === 'enabled'" class="flex flex-col gap-3 max-w-xs">
      <UBadge color="success" variant="subtle" icon="i-lucide-shield-check"> MFA activado </UBadge>
      <UButton
        color="error"
        variant="ghost"
        icon="i-lucide-shield-off"
        class="w-fit"
        :loading="loadingMfa"
        @click="disableMfa"
      >
        Desactivar MFA
      </UButton>
    </div>
  </UPageCard>

  <!-- Danger zone -->
  <UPageCard
    title="Cuenta"
    description="¿Ya no querés usar el servicio? Podés eliminar tu cuenta. Esta acción no tiene vuelta atrás."
    class="bg-gradient-to-tl from-error/10 from-5% to-default"
  >
    <template #footer>
      <UButton label="Eliminar cuenta" color="error" />
    </template>
  </UPageCard>
</template>
