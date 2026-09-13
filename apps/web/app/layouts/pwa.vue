<script setup lang="ts">
/**
 * Shell de la PWA instalada (standalone) — sin Navbar/Footer clásico, con
 * bottom nav fija. Seleccionado dinámicamente por
 * middleware/pwa-layout.global.ts, nunca vía definePageMeta de una página
 * individual. Todas las páginas se renderizan sin cambios adentro del
 * <slot/> — el shell no altera su contenido, solo el chrome alrededor.
 *
 * PwaTopBar vive DENTRO de .pwa-shell__content (el área con scroll), no
 * como elemento fixed — Haim lo pidió así explícitamente: el logo/idioma
 * deben desplazarse con la página como cualquier encabezado normal, no
 * quedar flotando encima del contenido todo el tiempo.
 *
 * Excepción: /search (PwaExploreScreen, Fase 3) pide el mapa a pantalla
 * completa — ahí se saca la PwaTopBar y el padding del content para que
 * el mapa llegue hasta arriba (PwaFloatingSearchBar ocupa ese rol en su
 * lugar). La bottom nav también se saca en activity/place — esas páginas
 * ya tienen su propio botón de volver, la nav de abajo sobra ahí.
 */
import { useRoute } from 'nuxt/app'

const route = useRoute()
const isFullBleedRoute = computed(() => route.path === '/search')
const hideBottomNav = computed(
  () => route.path.startsWith('/activity/') || route.path.startsWith('/place/')
)
</script>

<template>
  <div class="pwa-shell">
    <main
      class="pwa-shell__content"
      :class="{ 'pwa-shell__content--full-bleed': isFullBleedRoute }"
    >
      <PwaTopBar v-if="!isFullBleedRoute" />
      <slot />
    </main>

    <PwaBottomNav v-if="!hideBottomNav" />
    <ContactDrawer />
  </div>
</template>

<style scoped>
.pwa-shell {
  display: flex;
  flex-direction: column;
  /* 100dvh en vez de 100vh: en iOS/Android 100vh no descuenta la barra de
     direcciones dinámica y deja contenido tapado o un salto al hacer
     scroll — ver design del plan, sección "Responsive y dispositivos". */
  height: 100dvh;
  overflow: hidden;
  background: var(--color-bg-primary);
  /* Acá sí existe el pill de PwaBottomNav (56px) — pwa.css define el
     default global sin él, porque MapView.vue en chrome="fullbleed"
     también corre fuera de este shell (mobile web normal) donde no hay
     bottom nav que reservar. */
  --pwa-bottom-nav-height: calc(56px + var(--pwa-bottom-nav-offset) + var(--space-2));
}

.pwa-shell__content {
  flex: 1;
  min-height: 0;
  /* position:relative — PwaExploreScreen (full-bleed) se posiciona
     absolute/inset:0 contra ESTA caja en vez de depender de un height:100%
     en cascada (ver .search-map--fullbleed en MapView.vue). */
  position: relative;
  overflow-y: auto;
  /* Sin esto, cualquier hijo que se pase por poco del ancho del viewport
     (un carrusel horizontal mal contenido, un elemento con margin negativo)
     hace que TODA la página se pueda scrollear de costado en vez de solo
     ese elemento — es lo que reportó Haim al probar la Fase 2. */
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  /* Las páginas (Hero, carousels, etc.) delegan su padding horizontal al
     layout — igual que hace default.vue con UiContainer. fullwidth.vue no
     lo hace porque search.vue maneja su propio padding; layouts/pwa.vue SÍ
     lo necesita para las páginas normales, y la Fase 3 (mapa full-bleed)
     va a tener que contrarrestarlo explícitamente en su propio componente. */
  padding-inline: var(--space-4);
  /* Ya no se reserva padding-top para la top bar — ahora vive en el flujo
     normal del contenido (ver PwaTopBar más abajo), no fixed. Solo queda
     reservar espacio para la bottom nav, que sí sigue flotando fija. */
  padding-bottom: var(--pwa-bottom-nav-height);
}

/* Explore (mapa full-bleed): el mapa llega hasta los 4 bordes reales de
   la pantalla — el bottom nav flota ENCIMA (tiene z-index más alto), no
   al lado de un hueco reservado. Si acá se restara --pwa-bottom-nav-height
   como en el resto de las páginas, quedaría una franja de fondo blanco
   visible entre el mapa y el borde inferior real — el bug que reportó
   Haim al probar esto. PwaExploreScreen/MapView.vue son responsables de
   dejarle lugar al carousel/nav flotantes con su propio padding interno,
   no el shell. */
.pwa-shell__content--full-bleed {
  padding: 0;
}
</style>
