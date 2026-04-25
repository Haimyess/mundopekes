<script setup lang="ts">
definePageMeta({
  layout: false,
})

useHead({ title: 'Admin Login' })

const { login, verifyMfa, loading, mfaRequired } = useAuth()

const form = reactive({
  email: '',
  password: '',
})

const mfaCode = ref('')
const showPassword = ref(false)

const handleSubmit = async () => {
  await login(form.email, form.password)
}

const handleMfa = async () => {
  await verifyMfa(mfaCode.value)
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-(--ui-bg-elevated)">
    <div class="w-full max-w-sm px-4">
      <!-- Logo / Brand -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
          <UIcon name="i-lucide-shield-check" class="text-white text-2xl" />
        </div>
        <h1 class="text-2xl font-bold text-(--ui-text)">MundoPekes Admin</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          {{
            mfaRequired
              ? 'Ingresá el código de tu app autenticadora'
              : 'Ingresá con tu cuenta de administrador'
          }}
        </p>
      </div>

      <!-- Paso 1: Email + Password -->
      <UCard v-if="!mfaRequired" class="shadow-lg">
        <div class="flex flex-col gap-5 p-1">
          <UFormField label="Email" required>
            <UInput
              v-model="form.email"
              type="email"
              placeholder="admin@pekes.com"
              icon="i-lucide-mail"
              size="lg"
              class="w-full"
              autocomplete="email"
              @keyup.enter="handleSubmit"
            />
          </UFormField>

          <UFormField label="Contraseña" required>
            <UInput
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              icon="i-lucide-lock"
              size="lg"
              class="w-full"
              autocomplete="current-password"
              @keyup.enter="handleSubmit"
            >
              <template #trailing>
                <button type="button" class="cursor-pointer" @click="showPassword = !showPassword">
                  <UIcon
                    :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    class="text-(--ui-text-muted)"
                  />
                </button>
              </template>
            </UInput>
          </UFormField>

          <UButton size="lg" block :loading="loading" icon="i-lucide-log-in" @click="handleSubmit">
            Iniciar sesión
          </UButton>
        </div>
      </UCard>

      <!-- Paso 2: Código MFA -->
      <UCard v-else class="shadow-lg">
        <div class="flex flex-col gap-5 p-1">
          <div
            class="flex items-center justify-center w-12 h-12 rounded-xl bg-(--ui-bg-accented) mx-auto"
          >
            <UIcon name="i-lucide-smartphone" class="text-(--ui-text) text-2xl" />
          </div>

          <UFormField label="Código de verificación" required>
            <UInput
              v-model="mfaCode"
              placeholder="123456"
              icon="i-lucide-key-round"
              size="lg"
              class="w-full"
              maxlength="6"
              autocomplete="one-time-code"
              inputmode="numeric"
              @keyup.enter="handleMfa"
            />
          </UFormField>

          <UButton
            size="lg"
            block
            :loading="loading"
            icon="i-lucide-shield-check"
            @click="handleMfa"
          >
            Verificar
          </UButton>

          <button
            class="text-xs text-(--ui-text-muted) text-center hover:underline"
            @click="mfaRequired = false"
          >
            ← Volver al login
          </button>
        </div>
      </UCard>

      <p class="text-center text-xs text-(--ui-text-muted) mt-6">
        MundoPekes Admin · Solo acceso autorizado
      </p>
    </div>
  </div>
</template>
