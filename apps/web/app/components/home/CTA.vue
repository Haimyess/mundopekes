<script setup lang="ts">
const { t } = useI18n()
// import SuggestionModal from '../suggestions/SuggestionModal.vue';

// const showModal = ref(false)
// Add it to a store or composable becuase its been used in many places. 
const wizardOpen = ref(false)
</script>

<template>
  <section class="py-12 md:py-16">
    <div class="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 md:p-12 text-center text-white shadow-xl">
      <h2 class="text-3xl md:text-4xl font-bold mb-4">
        {{ t('cta.title') }}
      </h2>
      <p class="text-xl mb-8 text-primary-100">
        {{ t('cta.description') }}
      </p>
      <!-- <UiButton
        variant="secondary"
        size="lg"
        icon="i-heroicons-plus-circle"
        @click="showModal = true"
      >
        {{ t('cta.button') }}
      </UiButton> -->

        <UiButton variant="primary" @click="wizardOpen = true">
    Sugerir un lugar
  </UiButton>
    </div>

    <!-- <SuggestionModal
      v-model:open="showModal"
      @close="showModal = false"

      /> -->
      <SuggestionsSuggestionWizard v-model:open="wizardOpen" />
  </section>
</template>
