<!-- app/pages/login.vue -->
<script setup lang="ts">
import { useAuth
    
 } from '~/composables/useAuth'
definePageMeta({
  layout: false, // Sin layout del dashboard
})

const { login, loading } = useAuth()

const form = reactive({
  email: '',
  password: '',
})

const showPassword = ref(false)

const handleSubmit = async () => {
  await login(form.email, form.password)
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
        <h1 class="text-2xl font-bold text-(--ui-text)">
          Pekes Admin
        </h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          Ingresá con tu cuenta de administrador
        </p>
      </div>

      <!-- Card del form -->
      <UCard class="shadow-lg">
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
              :trailing-icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              @click-trailing="showPassword = !showPassword"
              @keyup.enter="handleSubmit"
            />
          </UFormField>

          <UButton
            size="lg"
            block
            :loading="loading"
            icon="i-lucide-log-in"
            @click="handleSubmit"
          >
            Iniciar sesión
          </UButton>
        </div>
      </UCard>

      <p class="text-center text-xs text-(--ui-text-muted) mt-6">
        Pekes Admin · Solo acceso autorizado
      </p>
    </div>
  </div>
</template>