// app/composables/useFaqs.ts
import type { Tables } from '~/types/database.types'

export type Faq = Tables<'faqs'> & {
  faq_category?: { id: string; name: string; slug: string } | null
}
export type FaqCategory = Tables<'faq_categories'>

export const useFaqs = () => {
  const {
    items: faqs,
    loading,
    saving,
    fetch,
    create,
    update,
    remove,
  } = useAdminCrud<Faq>('/api/faqs', {
    loadError: 'support.faqs.toast.loadError',
    created: 'support.faqs.toast.created',
    createError: 'support.faqs.toast.createError',
    updated: 'support.faqs.toast.updated',
    updateError: 'support.faqs.toast.updateError',
    deleted: 'support.faqs.toast.deleted',
    deleteError: 'support.faqs.toast.deleteError',
  })

  const faqCategories = ref<FaqCategory[]>([])

  const fetchCategories = async () => {
    faqCategories.value = await $fetch<FaqCategory[]>('/api/faq-categories')
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
