<script setup lang="ts">
const { t } = useI18n()
const wizardOpen = ref(false)
</script>

<template>
  <section class="cta">
    <!-- Fondo con decoración -->
    <div class="cta__bg">
      <span class="cta__dot cta__dot--1" />
      <span class="cta__dot cta__dot--2" />
      <span class="cta__dot cta__dot--3" />
      <span class="cta__dot cta__dot--4" />
      <span class="cta__arc" />
    </div>

    <div class="cta__content">
      <h2 class="cta__title">{{ t('cta.title') }}</h2>
      <p class="cta__desc">{{ t('cta.description') }}</p>
      <UiButton class="cta__btn" @click="wizardOpen = true"> Sugerir un lugar </UiButton>
    </div>

    <SuggestionsSuggestionWizard v-model:open="wizardOpen" />
  </section>
</template>

<style scoped>
.cta {
  position: relative;
  overflow: hidden;
  margin: var(--space-10) 0 var(--space-12);
  border-radius: var(--border-radius-2xl, 1.5rem);
  background: var(--color-neutral-50, #f9fafb);
  border: 1px solid var(--color-neutral-200, #e5e5e5);
}

/* ── Decoración ───────────────────────────────────────────── */
.cta__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.cta__dot {
  position: absolute;
  border-radius: 9999px;
}

.cta__dot--1 {
  width: 10px;
  height: 10px;
  background: #6366f1;
  top: 28%;
  left: 8%;
}
.cta__dot--2 {
  width: 8px;
  height: 8px;
  background: #ef4444;
  top: 20%;
  left: 18%;
}
.cta__dot--3 {
  width: 14px;
  height: 14px;
  background: #22c55e;
  top: 40%;
  left: 12%;
}
.cta__dot--4 {
  width: 6px;
  height: 6px;
  background: #3b82f6;
  top: 55%;
  left: 20%;
}

/* Arco verde grande en la esquina derecha */
.cta__arc {
  position: absolute;
  inset-inline-end: -60px;
  top: -60px;
  width: 220px;
  height: 220px;
  border-radius: 9999px;
  border: 40px solid var(--color-secondary-500, #22c55e);
  opacity: 0.85;
}

/* ── Contenido centrado ───────────────────────────────────── */
.cta__content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-12) var(--space-8);
  gap: var(--space-4);
  /* Dejar espacio al arc en desktop */
  padding-inline-end: clamp(var(--space-8), 18%, 200px);
}

.cta__title {
  font-family: var(--font-family-display);
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.15;
}

.cta__desc {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: var(--line-height-relaxed);
  max-width: 42ch;
}

.cta__btn {
  margin-top: var(--space-2);
}

@media (min-width: 768px) {
  .cta__dot--1 {
    left: 5%;
  }
  .cta__dot--2 {
    left: 12%;
  }
  .cta__dot--3 {
    left: 8%;
  }
  .cta__dot--4 {
    left: 15%;
  }

  .cta__arc {
    width: 280px;
    height: 280px;
    inset-inline-end: -80px;
    top: -80px;
    border-width: 52px;
  }
}
</style>
