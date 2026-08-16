<script setup lang="ts">
const { t } = useI18n()
const { open: openContact } = useContactForm()

const currentYear = new Date().getFullYear()

const footerLinks = [
  { label: 'footer.about', to: '/about' },
  { label: 'footer.privacy', to: '/privacy' },
  { label: 'footer.terms', to: '/terms' },
  // Deshabilitado temporalmente — ver pages/become-provider.vue
  // { label: 'provider.footer_link', to: '/become-provider' },
]
</script>

<template>
  <footer class="footer">
    <UiContainer>
      <div class="footer__inner">
        <span class="footer__logo">MundoPekes</span>

        <nav class="footer__nav">
          <NuxtLink v-for="link in footerLinks" :key="link.to" :to="link.to" class="footer__link">
            {{ t(link.label) }}
          </NuxtLink>
          <button class="footer__link footer__link--btn" @click="openContact('other')">
            {{ t('nav.contact') }}
          </button>
        </nav>

        <p class="footer__copy">© {{ currentYear }} MundoPekes</p>
      </div>
    </UiContainer>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--color-neutral-200, #e5e5e5);
  padding: var(--space-8) 0;
  margin-top: auto;
  background: #fff;
}

.footer__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  text-align: center;
}

.footer__logo {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-secondary-700);
  letter-spacing: -0.02em;
}

.footer__nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-1) var(--space-5);
}

.footer__link {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.15s;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
}

.footer__link:hover {
  color: var(--color-text-primary);
}

.footer__copy {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary, #a3a3a3);
  margin: 0;
}

@media (min-width: 768px) {
  .footer__inner {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    text-align: left;
  }

  .footer__nav {
    justify-content: flex-start;
  }
}
</style>
