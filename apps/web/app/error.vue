<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { searchLink } = useSearchLink()
const searchAction = computed(() => searchLink())

const NOT_FOUND = 404
const GONE = 410

const statusCode = computed(() => props.error.statusCode ?? 500)
const isNotFound = computed(() => statusCode.value === NOT_FOUND)
const isGone = computed(() => statusCode.value === GONE)
const messageKey = computed(() =>
  isNotFound.value ? 'errors.notFound' : isGone.value ? 'errors.gone' : 'errors.generic'
)

useSeoMeta({
  title: () => t(`${messageKey.value}.title`),
  robots: 'noindex, nofollow',
})

const handleHome = () => clearError({ redirect: localePath('/') })
const handleRetry = () => clearError({ redirect: route.fullPath })
</script>

<template>
  <NuxtLayout>
    <section class="error-page" aria-labelledby="error-page-title">
      <p v-if="isNotFound || isGone" class="error-page__code" dir="ltr">{{ statusCode }}</p>
      <h1 id="error-page-title" class="error-page__title">{{ t(`${messageKey}.title`) }}</h1>
      <p class="error-page__description">{{ t(`${messageKey}.description`) }}</p>

      <form
        v-if="isNotFound || isGone"
        :action="searchAction"
        method="get"
        role="search"
        class="error-page__search"
      >
        <label for="error-page-search" class="error-page__label">{{
          t('errors.searchLabel')
        }}</label>
        <div class="error-page__search-row">
          <input
            id="error-page-search"
            name="q"
            type="search"
            class="error-page__input"
            autocomplete="off"
          />
          <UiButton type="submit" icon="i-hugeicons-search-01">{{
            t('errors.searchSubmit')
          }}</UiButton>
        </div>
      </form>

      <div class="error-page__actions">
        <UiButton v-if="!isNotFound && !isGone" @click="handleRetry">{{
          t('errors.retry')
        }}</UiButton>
        <UiButton variant="secondary" @click="handleHome">{{ t('errors.home') }}</UiButton>
      </div>
    </section>
  </NuxtLayout>
</template>

<style scoped>
.error-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-inline-size: 560px;
  margin-inline: auto;
  padding: 48px var(--mp-gutter);
  color: var(--mp-ink);
  font-family: var(--mp-font);
}

.error-page__code {
  margin: 0;
  color: var(--mp-coral);
  font-size: var(--mp-fs-section-title);
  font-weight: var(--mp-fw-heavy);
}

.error-page__title {
  margin: 0;
  font-size: var(--mp-fs-detail-title);
  font-weight: var(--mp-fw-heavy);
  letter-spacing: var(--mp-ls-detail-title);
  line-height: 1.1;
}

.error-page__description {
  margin: 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body-lg);
}

.error-page__search {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-block-start: 8px;
}

.error-page__label {
  font-size: var(--mp-fs-body);
  font-weight: var(--mp-fw-semibold);
}

.error-page__search-row {
  display: flex;
  gap: 8px;
}

.error-page__input {
  flex: 1;
  min-inline-size: 0;
  min-block-size: var(--mp-tap);
  padding-inline: 14px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-input);
  font: inherit;
}

.error-page__input:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 1px;
}

.error-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-start: 8px;
}
</style>
