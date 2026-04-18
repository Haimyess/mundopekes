<!-- app/pages/support/faqs.vue -->
<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { Faq } from '~/composables/useFaqs'

const { faqs, faqCategories, loading, saving, fetch, fetchCategories, create, update, remove, reorder } = useFaqs()

const slideoverOpen = ref(false)
const editingFaq = ref<Faq | null>(null)

const form = reactive({
  question: '',
  answer: '',
  faq_category_id: undefined as string | undefined,
  status: 'draft' as 'published' | 'draft'
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
    toast.add({ title: 'Pregunta y respuesta son requeridas', color: 'error' })
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
    : faqs.value.filter(f => f.faq_category_id === selectedCategory.value)
)

const localFaqs = ref<Faq[]>([])
watch(filteredFaqs, (val) => { localFaqs.value = [...val] }, { immediate: true })

const onDragEnd = async () => {
  await reorder(localFaqs.value)
}

const categoryOptions = computed(() => [
  { label: 'Todas las categorías', value: 'all' },
  ...faqCategories.value.map(c => ({ label: c.name, value: c.id }))
])

const statusColor = (status: string) =>
  status === 'published' ? 'success' as const : 'neutral' as const

// Cargar datos
await Promise.all([fetch(), fetchCategories()])
</script>

<template>
  <!-- Panel principal -->
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="FAQs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" @click="openCreate">
            Nueva FAQ
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <!-- ✅ slot #body obligatorio -->
    <template #body>
      <div class="p-4 flex flex-col gap-4">
        <!-- Filtro por categoría -->
        <USelect
          v-model="selectedCategory"
          :items="categoryOptions"
          class="max-w-xs"
        />

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
            <UCard
              v-for="faq in localFaqs"
              :key="faq.id"
            >
              <div class="flex items-start gap-3">
                <UIcon
                  name="i-lucide-grip-vertical"
                  class="drag-handle-faq cursor-grab text-muted size-4 mt-0.5 shrink-0"
                />

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <UBadge :color="statusColor(faq.status)" variant="subtle" size="xs">
                      {{ faq.status === 'published' ? 'Publicada' : 'Borrador' }}
                    </UBadge>
                    <UBadge
                      v-if="faq.faq_category"
                      color="neutral"
                      variant="subtle"
                      size="xs"
                    >
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
            No hay FAQs todavía. Creá la primera.
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <!-- ✅ Slideover FUERA del UDashboardPanel -->
  <USlideover
    :open="slideoverOpen"
    :title="editingFaq ? 'Editar FAQ' : 'Nueva FAQ'"
    :close="{ onClick: () => slideoverOpen = false }"
    @update:open="(val) => { if (!val) slideoverOpen = false }"
  >
    <template #body>
      <div class="flex flex-col gap-4 p-4">
        <UFormField label="Pregunta" required>
          <UInput
            v-model="form.question"
            placeholder="¿Cómo puedo...?"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Respuesta" required>
          <UTextarea
            v-model="form.answer"
            :rows="5"
            placeholder="La respuesta detallada..."
            class="w-full"
          />
        </UFormField>

        <UFormField label="Categoría">
          <USelect
            v-model="form.faq_category_id"
            :items="faqCategories.map(c => ({ label: c.name, value: c.id }))"
            placeholder="Seleccioná una categoría"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Estado">
          <USelect
            v-model="form.status"
            :items="[
              { label: 'Borrador', value: 'draft' },
              { label: 'Publicada', value: 'published' }
            ]"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton
          color="neutral"
          variant="outline"
          @click="slideoverOpen = false"
        >
          Cancelar
        </UButton>
        <UButton
          :loading="saving"
          icon="i-lucide-save"
          @click="save"
        >
          {{ editingFaq ? 'Guardar cambios' : 'Crear FAQ' }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
