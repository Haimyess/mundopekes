<script setup lang="ts">
/**
 * Top bar mínima del shell PWA — reemplaza al Navbar de desktop/mobile web
 * (que layouts/pwa.vue no monta). Solo wordmark (vuelve a Home) + selector
 * de idioma (LayoutLanguageSelector reutilizado tal cual, mismo componente
 * que usaba el Navbar) — categorías y sugerir actividad quedan accesibles
 * vía el bottom nav, no se duplican acá.
 *
 * Texto en vez del logo-imagen: el PNG existente (mundopekes_logo_nobg.png)
 * es un lockup decorativo ancho con fondo oscuro, ilegible achicado a la
 * altura de esta barra — un wordmark de texto real con la tipografía de
 * marca se lee mejor a este tamaño.
 *
 * NO es fixed: vive dentro de .pwa-shell__content (layouts/pwa.vue), en
 * el flujo normal del documento — se desplaza con la página como
 * cualquier encabezado, no queda flotando encima del contenido.
 */
</script>

<template>
  <header class="pwa-top-bar">
    <NuxtLink to="/" class="pwa-top-bar__logo">MundoPekes</NuxtLink>
    <LayoutLanguageSelector />
  </header>
</template>

<style scoped>
.pwa-top-bar {
  /* padding-top con el safe-area: acá arriba de todo es donde puede
     tocar el notch/status bar, antes de que el usuario scrollee. */
  padding-top: calc(var(--safe-area-inset-top) + var(--space-2));
  padding-bottom: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.pwa-top-bar__logo {
  display: flex;
  align-items: center;
  min-width: 0;
  font-family: var(--font-family-display);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent-700);
  letter-spacing: -0.02em;
  text-decoration: none;
}
</style>
