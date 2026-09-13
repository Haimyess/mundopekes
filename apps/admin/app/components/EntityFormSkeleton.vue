<!-- app/components/EntityFormSkeleton.vue -->
<!-- Placeholder para el body de un drawer de edición (Places/Activities)
     mientras sus datos de referencia (categorías, lugares, ciudades, etc.)
     todavía no llegaron. El drawer en sí (título, footer, botón cerrar) se
     monta instantáneo — sólo el contenido del formulario espera esto. -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    fields?: number
  }>(),
  {
    fields: 6,
  }
)
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <div v-for="i in fields" :key="i" class="flex flex-col gap-1.5">
      <USkeleton class="h-3 w-24" />
      <USkeleton class="h-9 w-full rounded-md" />
    </div>
  </div>
</template>
