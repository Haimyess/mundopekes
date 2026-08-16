<script setup lang="ts">
// Feature deshabilitada temporalmente: se deja el código listo para
// retomarla más adelante, pero la ruta no debe quedar accesible a
// usuarios mientras tanto (ver también Footer.vue y ContactFormBody.vue).
definePageMeta({
  middleware: () => navigateTo('/', { redirectCode: 302 }),
})

const { t, locale } = useI18n()

useHead({ title: () => t('provider.page_title') })

const step = ref(1)
const isSubmitting = ref(false)
const submitted = ref(false)
const submitError = ref('')

const form = reactive({
  name: '',
  email: '',
  phone: '',
  website: '',
  description: '',
  activity_types: [] as string[],
  address: '',
  city: '',
  schedule: {} as Record<string, { open: string; close: string; closed: boolean }>,
  price_from: '' as string | number,
  price_to: '' as string | number,
  currency: 'ILS' as 'ILS' | 'USD',
})

const errors = reactive({
  name: '',
  email: '',
  description: '',
  activity_types: '',
})

const activityTypeOptions = computed(() => [
  { key: 'art', label: t('provider.type_art') },
  { key: 'music', label: t('provider.type_music') },
  { key: 'sport', label: t('provider.type_sport') },
  { key: 'nature', label: t('provider.type_nature') },
  { key: 'cooking', label: t('provider.type_cooking') },
  { key: 'tech', label: t('provider.type_tech') },
  { key: 'theater', label: t('provider.type_theater') },
  { key: 'languages', label: t('provider.type_languages') },
  { key: 'other', label: t('provider.type_other') },
])

const days = computed(() => [
  { key: 'sunday', label: t('provider.day_sunday') },
  { key: 'monday', label: t('provider.day_monday') },
  { key: 'tuesday', label: t('provider.day_tuesday') },
  { key: 'wednesday', label: t('provider.day_wednesday') },
  { key: 'thursday', label: t('provider.day_thursday') },
  { key: 'friday', label: t('provider.day_friday') },
  { key: 'saturday', label: t('provider.day_saturday') },
])

const currencyOptions = [
  { label: '₪ ILS', value: 'ILS' },
  { label: '$ USD', value: 'USD' },
]

const getDaySchedule = (key: string) => {
  if (!form.schedule[key]) {
    form.schedule[key] = { open: '09:00', close: '17:00', closed: false }
  }
  return form.schedule[key]
}

const toggleType = (key: string) => {
  const idx = form.activity_types.indexOf(key)
  if (idx === -1) form.activity_types.push(key)
  else form.activity_types.splice(idx, 1)
}

const validateStep1 = () => {
  errors.name = ''
  errors.email = ''
  errors.description = ''
  let valid = true
  if (!form.name.trim()) {
    errors.name = t('provider.error_name')
    valid = false
  }
  if (!form.email.trim() || !/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(form.email)) {
    errors.email = t('provider.error_email')
    valid = false
  }
  if (form.description.length < 50) {
    errors.description = t('provider.error_description_min')
    valid = false
  }
  return valid
}

const validateStep2 = () => {
  errors.activity_types = ''
  if (form.activity_types.length === 0) {
    errors.activity_types = t('provider.error_types')
    return false
  }
  return true
}

const next = () => {
  if (step.value === 1 && !validateStep1()) return
  if (step.value === 2 && !validateStep2()) return
  step.value++
}

const back = () => {
  step.value--
}

const handleSubmit = async () => {
  if (!validateStep1() || !validateStep2()) {
    step.value = 1
    return
  }
  isSubmitting.value = true
  submitError.value = ''

  const schedulePayload: Record<string, { open: string; close: string; closed: boolean }> = {}
  for (const [day, val] of Object.entries(form.schedule)) {
    schedulePayload[day] = val
  }

  try {
    await $fetch('/api/providers', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        website: form.website || undefined,
        description: form.description,
        activity_types: form.activity_types,
        address: form.address || undefined,
        city: form.city || undefined,
        schedule: Object.keys(schedulePayload).length ? schedulePayload : undefined,
        price_range:
          form.price_from || form.price_to
            ? {
                from: form.price_from ? Number(form.price_from) : undefined,
                to: form.price_to ? Number(form.price_to) : undefined,
                currency: form.currency,
              }
            : undefined,
      },
    })
    submitted.value = true
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string }; message?: string }
    submitError.value = e?.data?.statusMessage ?? e?.message ?? t('provider.error_title')
  } finally {
    isSubmitting.value = false
  }
}

const isRtl = computed(() => locale.value === 'he')
</script>

<template>
  <div class="provider-page" :dir="isRtl ? 'rtl' : 'ltr'">
    <!-- Hero -->
    <section class="provider-page__hero">
      <UiContainer>
        <h1 class="provider-page__title">{{ t('provider.page_title') }}</h1>
        <p class="provider-page__subtitle">{{ t('provider.page_subtitle') }}</p>
      </UiContainer>
    </section>

    <!-- Benefits -->
    <section class="provider-page__benefits">
      <UiContainer>
        <div class="benefits-grid">
          <div class="benefit-card">
            <span class="benefit-card__icon">🎯</span>
            <h3>{{ t('provider.benefit_1_title') }}</h3>
            <p>{{ t('provider.benefit_1_desc') }}</p>
          </div>
          <div class="benefit-card">
            <span class="benefit-card__icon">👨‍👩‍👧‍👦</span>
            <h3>{{ t('provider.benefit_2_title') }}</h3>
            <p>{{ t('provider.benefit_2_desc') }}</p>
          </div>
          <div class="benefit-card">
            <span class="benefit-card__icon">🎁</span>
            <h3>{{ t('provider.benefit_3_title') }}</h3>
            <p>{{ t('provider.benefit_3_desc') }}</p>
          </div>
        </div>
      </UiContainer>
    </section>

    <!-- Form section -->
    <section class="provider-page__form-section">
      <UiContainer>
        <!-- Success state -->
        <div v-if="submitted" class="success-box">
          <div class="success-box__icon">✓</div>
          <h2>{{ t('provider.success_title') }}</h2>
          <p>{{ t('provider.success_desc') }}</p>
        </div>

        <!-- Form -->
        <div v-else class="form-card">
          <!-- Progress bar -->
          <div class="progress-bar">
            <div
              v-for="n in 3"
              :key="n"
              class="progress-bar__step"
              :class="{
                'progress-bar__step--active': step >= n,
                'progress-bar__step--current': step === n,
              }"
            >
              <span class="progress-bar__number">{{ n }}</span>
              <span class="progress-bar__label">
                {{ t(`provider.step${n}_title`) }}
              </span>
            </div>
          </div>

          <!-- Step 1 -->
          <div v-if="step === 1" class="form-step">
            <h2 class="form-step__title">{{ t('provider.step1_title') }}</h2>

            <div class="form-field">
              <label class="form-field__label">{{ t('provider.name') }} *</label>
              <UiInput v-model="form.name" :placeholder="t('provider.name_placeholder')" />
              <span v-if="errors.name" class="form-field__error">{{ errors.name }}</span>
            </div>

            <div class="form-field">
              <label class="form-field__label">{{ t('provider.email') }} *</label>
              <UiInput
                v-model="form.email"
                type="email"
                :placeholder="t('provider.email_placeholder')"
              />
              <span v-if="errors.email" class="form-field__error">{{ errors.email }}</span>
            </div>

            <div class="form-field">
              <label class="form-field__label">{{ t('provider.phone') }}</label>
              <UiInput
                v-model="form.phone"
                type="tel"
                :placeholder="t('provider.phone_placeholder')"
              />
            </div>

            <div class="form-field">
              <label class="form-field__label">{{ t('provider.website') }}</label>
              <UiInput
                v-model="form.website"
                type="url"
                :placeholder="t('provider.website_placeholder')"
              />
            </div>

            <div class="form-field">
              <label class="form-field__label">{{ t('provider.description') }} *</label>
              <textarea
                v-model="form.description"
                class="form-field__textarea"
                :placeholder="t('provider.description_placeholder')"
                rows="5"
              />
              <div class="form-field__footer">
                <span v-if="errors.description" class="form-field__error">{{
                  errors.description
                }}</span>
                <span
                  class="form-field__chars"
                  :class="{ 'form-field__chars--ok': form.description.length >= 50 }"
                >
                  {{ t('provider.description_chars', { count: form.description.length }) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Step 2 -->
          <div v-else-if="step === 2" class="form-step">
            <h2 class="form-step__title">{{ t('provider.step2_title') }}</h2>

            <div class="form-field">
              <label class="form-field__label">{{ t('provider.activity_types') }} *</label>
              <div class="checkbox-grid">
                <label
                  v-for="opt in activityTypeOptions"
                  :key="opt.key"
                  class="checkbox-item"
                  :class="{ 'checkbox-item--checked': form.activity_types.includes(opt.key) }"
                >
                  <input
                    type="checkbox"
                    :checked="form.activity_types.includes(opt.key)"
                    @change="toggleType(opt.key)"
                  />
                  {{ opt.label }}
                </label>
              </div>
              <span v-if="errors.activity_types" class="form-field__error">{{
                errors.activity_types
              }}</span>
            </div>

            <div class="form-field">
              <label class="form-field__label">{{ t('provider.address') }}</label>
              <UiInput v-model="form.address" :placeholder="t('provider.address_placeholder')" />
            </div>

            <div class="form-field">
              <label class="form-field__label">{{ t('provider.city') }}</label>
              <UiInput v-model="form.city" :placeholder="t('provider.city_placeholder')" />
            </div>
          </div>

          <!-- Step 3 -->
          <div v-else-if="step === 3" class="form-step">
            <h2 class="form-step__title">{{ t('provider.step3_title') }}</h2>

            <!-- Schedule -->
            <div class="form-field">
              <label class="form-field__label">{{ t('provider.schedule') }}</label>
              <div class="schedule-grid">
                <div v-for="day in days" :key="day.key" class="schedule-row">
                  <span class="schedule-row__day">{{ day.label }}</span>
                  <label class="schedule-row__toggle">
                    <input
                      type="checkbox"
                      :checked="!getDaySchedule(day.key).closed"
                      @change="
                        getDaySchedule(day.key).closed = !($event.target as HTMLInputElement)
                          .checked
                      "
                    />
                    <span>{{
                      getDaySchedule(day.key).closed
                        ? t('provider.schedule_closed')
                        : t('provider.schedule_open')
                    }}</span>
                  </label>
                  <template v-if="!getDaySchedule(day.key).closed">
                    <input
                      v-model="getDaySchedule(day.key).open"
                      type="time"
                      class="schedule-row__time"
                    />
                    <span class="schedule-row__sep">–</span>
                    <input
                      v-model="getDaySchedule(day.key).close"
                      type="time"
                      class="schedule-row__time"
                    />
                  </template>
                </div>
              </div>
            </div>

            <!-- Price range -->
            <div class="form-field">
              <label class="form-field__label">{{ t('provider.price_range') }}</label>
              <div class="price-grid">
                <div class="form-field">
                  <label class="form-field__label-sm">{{ t('provider.price_from') }}</label>
                  <UiInput v-model="form.price_from" type="number" placeholder="0" />
                </div>
                <div class="form-field">
                  <label class="form-field__label-sm">{{ t('provider.price_to') }}</label>
                  <UiInput v-model="form.price_to" type="number" placeholder="0" />
                </div>
                <div class="form-field">
                  <label class="form-field__label-sm">{{ t('provider.currency') }}</label>
                  <UiSelect v-model="form.currency" :options="currencyOptions" />
                </div>
              </div>
            </div>

            <!-- Error -->
            <div v-if="submitError" class="submit-error">{{ submitError }}</div>
          </div>

          <!-- Navigation -->
          <div class="form-nav">
            <UiButton v-if="step > 1" variant="ghost" @click="back">
              {{ t('provider.back') }}
            </UiButton>
            <div class="form-nav__spacer" />
            <UiButton v-if="step < 3" @click="next">
              {{ t('provider.next') }}
            </UiButton>
            <UiButton v-else :loading="isSubmitting" @click="handleSubmit">
              {{ isSubmitting ? t('provider.submitting') : t('provider.submit') }}
            </UiButton>
          </div>
        </div>
      </UiContainer>
    </section>
  </div>
</template>

<style scoped>
.provider-page {
  min-height: 100vh;
}

.provider-page__hero {
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800));
  color: white;
  padding: var(--spacing-16, 4rem) 0 var(--spacing-12, 3rem);
  text-align: center;
}

.provider-page__title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  margin-bottom: var(--spacing-3, 0.75rem);
}

.provider-page__subtitle {
  font-size: 1.125rem;
  opacity: 0.9;
}

.provider-page__benefits {
  padding: var(--spacing-12, 3rem) 0;
  background: var(--color-secondary-50, #f9fafb);
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-6, 1.5rem);
}

.benefit-card {
  background: white;
  border-radius: var(--radius-xl, 0.75rem);
  padding: var(--spacing-6, 1.5rem);
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.benefit-card__icon {
  font-size: 2rem;
  display: block;
  margin-bottom: var(--spacing-3, 0.75rem);
}

.benefit-card h3 {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: var(--spacing-2, 0.5rem);
  color: var(--color-secondary-900, #111827);
}

.benefit-card p {
  font-size: 0.875rem;
  color: var(--color-secondary-500, #6b7280);
}

.provider-page__form-section {
  padding: var(--spacing-12, 3rem) 0 var(--spacing-16, 4rem);
}

.form-card {
  max-width: 640px;
  margin: 0 auto;
  background: white;
  border-radius: var(--radius-2xl, 1rem);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  padding: var(--spacing-8, 2rem);
}

.success-box {
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
  padding: var(--spacing-12, 3rem) var(--spacing-8, 2rem);
}

.success-box__icon {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: var(--color-primary-100, #dbeafe);
  color: var(--color-primary-600, #2563eb);
  font-size: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-4, 1rem);
}

.success-box h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: var(--spacing-2, 0.5rem);
}

.success-box p {
  color: var(--color-secondary-500, #6b7280);
}

/* Progress bar */
.progress-bar {
  display: flex;
  gap: var(--spacing-2, 0.5rem);
  margin-bottom: var(--spacing-8, 2rem);
}

.progress-bar__step {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-2, 0.5rem);
  padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
  border-radius: var(--radius-lg, 0.5rem);
  background: var(--color-secondary-100, #f3f4f6);
  font-size: 0.75rem;
  color: var(--color-secondary-400, #9ca3af);
  transition: all 0.2s;
}

.progress-bar__step--active {
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-primary-700, #1d4ed8);
}

.progress-bar__step--current {
  background: var(--color-primary-600, #2563eb);
  color: white;
}

.progress-bar__number {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: currentColor;
  color: white;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.progress-bar__step--current .progress-bar__number {
  background: white;
  color: var(--color-primary-600, #2563eb);
}

.progress-bar__label {
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Form step */
.form-step {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5, 1.25rem);
}

.form-step__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-secondary-900, #111827);
  margin-bottom: var(--spacing-1, 0.25rem);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1, 0.25rem);
}

.form-field__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-secondary-700, #374151);
}

.form-field__label-sm {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-secondary-500, #6b7280);
}

.form-field__textarea {
  width: 100%;
  padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
  border: 1px solid var(--color-secondary-300, #d1d5db);
  border-radius: var(--radius-md, 0.375rem);
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  transition: border-color 0.15s;
}

.form-field__textarea:focus {
  outline: none;
  border-color: var(--color-primary-500, #3b82f6);
  box-shadow: 0 0 0 2px var(--color-primary-100, #dbeafe);
}

.form-field__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-field__error {
  font-size: 0.75rem;
  color: var(--color-error-600, #dc2626);
}

.form-field__chars {
  font-size: 0.75rem;
  color: var(--color-secondary-400, #9ca3af);
  margin-left: auto;
}

.form-field__chars--ok {
  color: var(--color-primary-600, #2563eb);
}

/* Checkboxes */
.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--spacing-2, 0.5rem);
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2, 0.5rem);
  padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
  border: 1px solid var(--color-secondary-200, #e5e7eb);
  border-radius: var(--radius-md, 0.375rem);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.checkbox-item--checked {
  border-color: var(--color-primary-400, #60a5fa);
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-primary-700, #1d4ed8);
}

/* Schedule */
.schedule-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2, 0.5rem);
}

.schedule-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-3, 0.75rem);
  padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
  border: 1px solid var(--color-secondary-200, #e5e7eb);
  border-radius: var(--radius-md, 0.375rem);
}

.schedule-row__day {
  width: 6rem;
  font-size: 0.875rem;
  font-weight: 500;
  flex-shrink: 0;
}

.schedule-row__toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-1, 0.25rem);
  font-size: 0.75rem;
  cursor: pointer;
  min-width: 4.5rem;
}

.schedule-row__time {
  padding: 2px var(--spacing-2, 0.5rem);
  border: 1px solid var(--color-secondary-300, #d1d5db);
  border-radius: var(--radius-sm, 0.25rem);
  font-size: 0.875rem;
  width: 6rem;
}

.schedule-row__sep {
  color: var(--color-secondary-400, #9ca3af);
}

/* Price */
.price-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--spacing-3, 0.75rem);
}

/* Nav */
.form-nav {
  display: flex;
  align-items: center;
  padding-top: var(--spacing-6, 1.5rem);
  margin-top: var(--spacing-4, 1rem);
  border-top: 1px solid var(--color-secondary-100, #f3f4f6);
}

.form-nav__spacer {
  flex: 1;
}

.submit-error {
  padding: var(--spacing-3, 0.75rem);
  background: var(--color-error-50, #fef2f2);
  border: 1px solid var(--color-error-200, #fecaca);
  border-radius: var(--radius-md, 0.375rem);
  color: var(--color-error-700, #b91c1c);
  font-size: 0.875rem;
}

@media (max-width: 640px) {
  .price-grid {
    grid-template-columns: 1fr 1fr;
  }
  .schedule-row {
    flex-wrap: wrap;
  }
  .progress-bar__label {
    display: none;
  }
}
</style>
