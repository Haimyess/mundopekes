<!-- app/pages/support/faqs.vue -->
<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { Faq } from '~/composables/useFaqs'

const { t } = useI18n()

const {
  faqs,
  faqCategories,
  loading,
  saving,
  fetch,
  fetchCategories,
  create,
  update,
  remove,
  reorder,
} = useFaqs()

const slideoverOpen = ref(false)
const editingFaq = ref<Faq | null>(null)

const form = reactive({
  question: '',
  answer: '',
  faq_category_id: undefined as string | undefined,
  status: 'draft' as 'published' | 'draft',
})

const openCreate = () => {
  editingFaq.value = null
  form.question = ''
  form.answer = ''
  form.faq_category_id = undefined
  form.status = 'draft'
  slideoverOpen.value = true
}

const openEdit = (faq: Faq) => {
  editingFaq.value = faq
  form.question = faq.question
  form.answer = faq.answer
  form.faq_category_id = faq.faq_category_id ?? undefined
  form.status = faq.status as 'published' | 'draft'
  slideoverOpen.value = true
}

const save = async () => {
  const toast = useToast()
  if (!form.question.trim() || !form.answer.trim()) {
    toast.add({ title: t('support.faqs.toast.validationError'), color: 'error' })
    return
  }
  if (editingFaq.value) {
    await update(editingFaq.value.id, form)
  } else {
    await create(form)
  }
  slideoverOpen.value = false
}

const selectedCategory = ref<string>('all')

const filteredFaqs = computed(() =>
  selectedCategory.value === 'all'
    ? faqs.value
    : faqs.value.filter((f) => f.faq_category_id === selectedCategory.value)
)

const localFaqs = ref<Faq[]>([])
watch(
  filteredFaqs,
  (val) => {
    localFaqs.value = [...val]
  },
  { immediate: true }
)

const onDragEnd = async () => {
  await reorder(localFaqs.value)
}

const categoryOptions = computed(() => [
  { label: t('support.faqs.filter.allCategories'), value: 'all' },
  ...faqCategories.value.map((c) => ({ label: c.name, value: c.id })),
])

const statusColor = (status: string) =>
  status === 'published' ? ('success' as const) : ('neutral' as const)

// Cargar datos
await Promise.all([fetch(), fetchCategories()])
</script>

<template>
  <!-- Panel principal -->
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('support.faqs.header.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" @click="openCreate">
            {{ t('support.faqs.header.newButton') }}
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <!-- ✅ slot #body obligatorio -->
    <template #body>
      <div class="p-4 flex flex-col gap-4">
        <!-- Filtro por categoría -->
        <USelect v-model="selectedCategory" :items="categoryOptions" class="max-w-xs" />

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-6 text-muted" />
        </div>

        <template v-else>
          <!-- Lista drag & drop -->
          <VueDraggable
            v-model="localFaqs"
            handle=".drag-handle-faq"
            :animation="150"
            ghost-class="opacity-40"
            class="flex flex-col gap-2"
            @end="onDragEnd"
          >
            <UCard v-for="faq in localFaqs" :key="faq.id">
              <div class="flex items-start gap-3">
                <UIcon
                  name="i-lucide-grip-vertical"
                  class="drag-handle-faq cursor-grab text-muted size-4 mt-0.5 shrink-0"
                />

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <UBadge :color="statusColor(faq.status)" variant="subtle" size="xs">
                      {{
                        faq.status === 'published'
                          ? t('support.faqs.status.published')
                          : t('support.faqs.status.draft')
                      }}
                    </UBadge>
                    <UBadge v-if="faq.faq_category" color="neutral" variant="subtle" size="xs">
                      {{ faq.faq_category.name }}
                    </UBadge>
                  </div>
                  <p class="text-sm font-medium">
                    {{ faq.question }}
                  </p>
                  <p class="text-xs text-muted mt-0.5 line-clamp-2">
                    {{ faq.answer }}
                  </p>
                </div>

                <div class="flex gap-1 shrink-0">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-pencil"
                    @click="openEdit(faq)"
                  />
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    :loading="saving"
                    @click="remove(faq.id)"
                  />
                </div>
              </div>
            </UCard>
          </VueDraggable>

          <!-- Vacío -->
          <div v-if="localFaqs.length === 0" class="text-center py-12 text-muted text-sm">
            {{ t('support.faqs.empty') }}
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <!-- ✅ Slideover FUERA del UDashboardPanel -->
  <USlideover
    :open="slideoverOpen"
    :title="
      editingFaq ? t('support.faqs.slideover.editTitle') : t('support.faqs.slideover.createTitle')
    "
    :close="{ onClick: () => (slideoverOpen = false) }"
    @update:open="
      (val) => {
        if (!val) slideoverOpen = false
      }
    "
  >
    <template #body>
      <div class="flex flex-col gap-4 p-4">
        <UFormField :label="t('support.faqs.form.questionLabel')" required>
          <UInput
            v-model="form.question"
            :placeholder="t('support.faqs.form.questionPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('support.faqs.form.answerLabel')" required>
          <UTextarea
            v-model="form.answer"
            :rows="5"
            :placeholder="t('support.faqs.form.answerPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('support.faqs.form.categoryLabel')">
          <USelect
            v-model="form.faq_category_id"
            :items="faqCategories.map((c) => ({ label: c.name, value: c.id }))"
            :placeholder="t('support.faqs.form.categoryPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('support.faqs.form.statusLabel')">
          <USelect
            v-model="form.status"
            :items="[
              { label: t('support.faqs.status.draft'), value: 'draft' },
              { label: t('support.faqs.status.published'), value: 'published' },
            ]"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton color="neutral" variant="outline" @click="slideoverOpen = false">
          {{ t('support.faqs.form.cancelButton') }}
        </UButton>
        <UButton :loading="saving" icon="i-lucide-save" @click="save">
          {{ editingFaq ? t('support.faqs.form.saveButton') : t('support.faqs.form.createButton') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
