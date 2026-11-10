<script setup lang="ts">
import { useMounted, useSessionStorage } from '@vueuse/core'

const DISMISSED_STORAGE_KEY = 'mp_family_prompt_dismissed'

const { t } = useI18n()
const { show } = useUiToast()
const { state } = useSearchState()
const { family, save, isSaved } = useFamily()
const isMounted = useMounted()
const isDismissed = useSessionStorage(DISMISSED_STORAGE_KEY, false)

const isUpdate = computed(() => !!family.value)
const isVisible = computed(
  () =>
    isMounted.value && !isDismissed.value && hasFamilyCriteria(state.value) && !isSaved(state.value)
)

const handleSave = () => {
  save(state.value)
  show({ title: t('family.saved'), tone: 'success' })
}
const handleDismiss = () => {
  isDismissed.value = true
}
</script>

<template>
  <section v-if="isVisible" class="family-prompt" aria-labelledby="family-prompt-title">
    <div class="family-prompt__text">
      <h2 id="family-prompt-title" class="family-prompt__title">
        {{ isUpdate ? t('family.prompt.updateTitle') : t('family.prompt.title') }}
      </h2>
      <p class="family-prompt__description">{{ t('family.prompt.description') }}</p>
    </div>
    <div class="family-prompt__actions">
      <UiButton size="sm" @click="handleSave">{{ t('family.prompt.save') }}</UiButton>
      <UiButton size="sm" variant="ghost" @click="handleDismiss">{{
        t('family.prompt.dismiss')
      }}</UiButton>
    </div>
  </section>
</template>

<style scoped>
.family-prompt {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-block-end: 16px;
  padding: 16px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-panel-sm);
  background: var(--mp-surface);
}

.family-prompt__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.family-prompt__title {
  margin: 0;
  color: var(--mp-ink);
  font-size: var(--mp-fs-body);
  font-weight: var(--mp-fw-bold);
}

.family-prompt__description {
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body-sm);
}

.family-prompt__actions {
  display: flex;
  gap: 8px;
}
</style>
