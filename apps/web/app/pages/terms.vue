<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: `${t('footer.terms')} | MundoPekes`,
})
</script>

<template>
  <UiContainer class="py-12 max-w-3xl">
    <h1 class="text-3xl font-bold text-gray-900 mb-6">Términos y Condiciones</h1>

    <p class="text-sm text-gray-500 mb-8">Última actualización: abril 2025</p>

    <div class="prose prose-gray max-w-none space-y-6 text-gray-700">
      <p>
        Al usar <strong>MundoPekes</strong> aceptas los siguientes términos y condiciones. Por favor
        léelos con atención antes de usar el sitio.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">1. Uso del sitio</h2>
      <p>
        MundoPekes es un directorio informativo de actividades para familias en Israel. La
        información publicada se ofrece de buena fe, pero puede estar desactualizada. Te
        recomendamos verificar los datos directamente con el proveedor de la actividad antes de
        visitarla.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">2. Contenido del directorio</h2>
      <p>
        Nos reservamos el derecho de revisar, editar o rechazar cualquier actividad sugerida por
        usuarios. Al sugerir una actividad, garantizas que la información proporcionada es veraz y
        no infringe derechos de terceros.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">3. Exactitud de la información</h2>
      <p>
        Hacemos nuestro mejor esfuerzo para mantener la información actualizada, pero no
        garantizamos la exactitud, completitud o vigencia de los datos publicados. MundoPekes no se
        responsabiliza por información incorrecta, cambios de horarios, precios u otras
        modificaciones en las actividades listadas.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">4. Propiedad intelectual</h2>
      <p>
        El diseño, logo y contenido propio de MundoPekes están protegidos por derechos de autor. No
        puedes reproducir, distribuir o modificar el contenido sin autorización expresa.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">5. Limitación de responsabilidad</h2>
      <p>
        MundoPekes no se hace responsable de daños directos o indirectos que puedan derivarse del
        uso del sitio o de la visita a actividades listadas en el directorio.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">6. Cambios en los términos</h2>
      <p>
        Podemos modificar estos términos en cualquier momento. El uso continuado del sitio tras la
        publicación de cambios implica la aceptación de los nuevos términos.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">7. Contacto</h2>
      <p>
        Para cualquier consulta sobre estos términos, puedes contactarnos a través del formulario de
        contacto disponible en el sitio.
      </p>
    </div>
  </UiContainer>
</template>
