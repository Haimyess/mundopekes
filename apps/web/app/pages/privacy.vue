<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: `${t('footer.privacy')} | MundoPekes`,
})
</script>

<template>
  <UiContainer class="py-12 max-w-3xl">
    <h1 class="text-3xl font-bold text-gray-900 mb-6">Política de Privacidad</h1>

    <p class="text-sm text-gray-500 mb-8">Última actualización: abril 2025</p>

    <div class="prose prose-gray max-w-none space-y-6 text-gray-700">
      <p>
        En <strong>MundoPekes</strong> nos tomamos muy en serio la privacidad de nuestros usuarios.
        Esta política describe qué información recopilamos, cómo la utilizamos y cómo la protegemos.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">1. Información que recopilamos</h2>
      <p>
        Recopilamos únicamente la información que tú nos proporcionas de forma voluntaria, como
        cuando:
      </p>
      <ul class="list-disc list-inside space-y-2">
        <li>Nos envías un mensaje a través del formulario de contacto (nombre, email, mensaje)</li>
        <li>Sugieres una actividad para incluir en el directorio</li>
      </ul>
      <p>
        No recopilamos datos de registro ni creamos cuentas de usuario. No guardamos información de
        pago.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">2. Cómo usamos la información</h2>
      <p>La información que recopilamos se usa exclusivamente para:</p>
      <ul class="list-disc list-inside space-y-2">
        <li>Responder a tus consultas o mensajes</li>
        <li>Revisar y publicar actividades sugeridas</li>
        <li>Mejorar la calidad del directorio</li>
      </ul>
      <p>No vendemos, alquilamos ni compartimos tu información personal con terceros.</p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">3. Cookies</h2>
      <p>
        Podemos utilizar cookies técnicas esenciales para el funcionamiento del sitio (como
        preferencias de idioma). No utilizamos cookies de seguimiento publicitario.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">4. Seguridad</h2>
      <p>
        Implementamos medidas de seguridad razonables para proteger la información que nos
        proporcionas. Sin embargo, ningún sistema de transmisión de datos por internet es 100%
        seguro.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">5. Cambios en esta política</h2>
      <p>
        Podemos actualizar esta política de privacidad ocasionalmente. Te notificaremos cualquier
        cambio relevante publicando la nueva versión en esta página con la fecha de actualización.
      </p>

      <h2 class="text-xl font-semibold text-gray-800 mt-8">6. Contacto</h2>
      <p>
        Si tienes preguntas sobre esta política de privacidad, puedes contactarnos a través del
        formulario de contacto disponible en el sitio.
      </p>
    </div>
  </UiContainer>
</template>
