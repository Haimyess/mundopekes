<script setup lang="ts">
// Layout base con Container global
import Container from '~/components/ui/Container.vue';
// import Navbar from '~/components/Layout/Navbar.vue';
// import Footer from '~/components/Layout/Footer.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Navbar (sticky, fuera del container para full-width background) -->
    <LayoutNavbar />

    <!-- Main content con Container -->
    <main class="flex-1">
      <Container>
        <slot />
      </Container>
    </main>

    <!-- Footer (fuera del container para full-width background) -->
    <LayoutFooter />
  </div>
</template>

<style scoped>
</style>