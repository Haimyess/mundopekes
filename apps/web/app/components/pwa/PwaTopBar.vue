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
  position: fixed;
  inset-inline: 0;
  top: 0;
  height: var(--pwa-top-bar-height);
  padding-top: var(--safe-area-inset-top);
  padding-inline: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  z-index: var(--z-index-top-bar);
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
