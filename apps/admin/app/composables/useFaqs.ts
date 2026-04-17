// app/composables/useFaqs.ts
import type { Tables } from '~/types/database.types'

export type Faq = Tables<'faqs'> & {
  faq_category?: { id: string; name: string; slug: string } | null
}
export type FaqCategory = Tables<'faq_categories'>

export const useFaqs = () => {
  const toast = useToast()
  const faqs = ref<Faq[]>([])
  const faqCategories = ref<FaqCategory[]>([])
  const loading = ref(false)
  const saving = ref(false)

  const fetchCategories = async () => {
    const data = await $fetch<FaqCategory[]>('/api/faq-categories')
    faqCategories.value = data
  }

  const fetch = async (filters?: { status?: string; faq_category_id?: string }) => {
    loading.value = true
    try {
      faqs.value = await $fetch<Faq[]>('/api/faqs', { params: filters })
    }
    catch (e: any) {
      toast.add({ title: 'Error cargando FAQs', description: e.message, color: 'error' })
    }
    finally {
      loading.value = false
    }
  }

  const create = async (data: Partial<Faq>) => {
    saving.value = true
    try {
      await $fetch('/api/faqs', { method: 'POST', body: data })
      toast.add({ title: 'FAQ creada', color: 'success' })
      await fetch()
    }
    catch (e: any) {
      toast.add({ title: 'Error al crear', description: e.message, color: 'error' })
    }
    finally {
      saving.value = false
    }
  }

  const update = async (id: string, data: Partial<Faq>) => {
    saving.value = true
    try {
      await $fetch(`/api/faqs/${id}`, { method: 'PUT', body: data })
      toast.add({ title: 'FAQ actualizada', color: 'success' })
      await fetch()
    }
    catch (e: any) {
      toast.add({ title: 'Error al actualizar', description: e.message, color: 'error' })
    }
    finally {
      saving.value = false
    }
  }

  const remove = async (id: string) => {
    saving.value = true
    try {
      await $fetch(`/api/faqs/${id}`, { method: 'DELETE' })
      toast.add({ title: 'FAQ eliminada', color: 'neutral' })
      await fetch()
    }
    catch (e: any) {
      toast.add({ title: 'Error al eliminar', description: e.message, color: 'error' })
    }
    finally {
      saving.value = false
    }
  }

  const reorder = async (newFaqs: Faq[]) => {
    const items = newFaqs.map((f, i) => ({ id: f.id, order: i }))
    await $fetch('/api/faqs/reorder', { method: 'POST', body: { items } })
  }

  return {
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
  }
}