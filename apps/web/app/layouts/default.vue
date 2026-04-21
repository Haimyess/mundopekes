<script setup lang="ts">
// Layout base con Container global
// import Navbar from '~/components/Layout/Navbar.vue';
// import Footer from '~/components/Layout/Footer.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Navbar (sticky, fuera del container para full-width background) -->
    <LayoutNavbar />

    <!-- Main content con Container -->
    <main class="flex-1">
      <UiContainer>
        <slot />
      </UiContainer>
    </main>

    <!-- Footer (fuera del container para full-width background) -->
    <LayoutFooter />

    <ContactDrawer />
  </div>
</template>

<style scoped></style>
