<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: `${t('footer.about')} | MundoPekes`,
})
</script>

<template>
  <UiContainer class="py-12 max-w-3xl">
    <h1 class="text-3xl font-bold text-gray-900 mb-6">
      {{ t('footer.about') }}
    </h1>

    <div class="prose prose-gray max-w-none space-y-6 text-gray-700">
      <p>
        <strong>MundoPekes</strong> es el directorio más completo de actividades y experiencias para
        familias con niños en Israel. Nuestro objetivo es ayudarte a descubrir lugares increíbles,
        parques, museos, talleres y mucho más, sin importar la edad de tus hijos.
      </p>

      <p>
        Somos una comunidad de familias que comparten y actualizan información sobre actividades
        para que siempre encuentres opciones frescas y relevantes cerca de ti.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">¿Qué encontrarás aquí?</h2>
      <ul class="list-disc list-inside space-y-2">
        <li>Cientos de actividades filtradas por edad, ciudad y temporada</li>
        <li>Información actualizada por la comunidad</li>
        <li>Actividades gratuitas y de pago</li>
        <li>Opciones para bebés, niños pequeños, escolares y adolescentes</li>
      </ul>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">¿Quieres agregar un lugar?</h2>
      <p>
        Si conoces una actividad genial que no está en nuestro directorio, puedes sugerirla desde el
        botón "Sugerir Actividad". La revisaremos y la publicaremos lo antes posible.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">Contacto</h2>
      <p>
        ¿Tienes preguntas, sugerencias o encontraste información desactualizada? Escríbenos a través
        del formulario de contacto disponible en el footer o en el menú de navegación.
      </p>
    </div>
  </UiContainer>
</template>
