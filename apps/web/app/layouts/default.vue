<template>
  <div class="layout-shell">
    <LayoutHeader />
    <main id="main-content" class="layout-shell__main" tabindex="-1">
      <UiContainer>
        <slot />
      </UiContainer>
    </main>
    <LayoutFooter />
    <ContactDrawer />
  </div>
</template>

<style scoped>
.layout-shell {
  display: flex;
  flex-direction: column;
  min-block-size: 100dvh;
}

.layout-shell__main {
  flex: 1;
}

.layout-shell__main:focus {
  outline: none;
}
</style>
