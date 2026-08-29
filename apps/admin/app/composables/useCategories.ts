// app/composables/useCategories.ts
import type { Tables } from '~/types/database.types'

export type Category = Tables<'categories'>

export interface CategoryWithChildren extends Category {
  children: Category[]
}

export const useCategories = () => {
  const {
    items: categories,
    loading,
    saving,
    fetch,
    create,
    update,
    remove,
  } = useAdminCrud<Category>('/api/categories', {
    loadError: 'categories.toast.loadError',
    created: 'categories.toast.created',
    createError: 'categories.toast.createError',
    updated: 'categories.toast.updated',
    updateError: 'categories.toast.updateError',
    deleted: 'categories.toast.deleted',
    deleteError: 'categories.toast.deleteError',
  })

  // Estructura árbol: padres con sus hijos
  const tree = computed<CategoryWithChildren[]>(() => {
    const parents = categories.value.filter((c) => !c.parent_id).sort((a, b) => a.order - b.order)

    return parents.map((parent) => ({
      ...parent,
      children: categories.value
        .filter((c) => c.parent_id === parent.id)
        .sort((a, b) => a.order - b.order),
    }))
  })

  // Después del drag & drop, recalcula el order y guarda
  const reorderParents = async (newTree: CategoryWithChildren[]) => {
    const items = newTree.map((c, i) => ({ id: c.id, order: i }))
    await $fetch('/api/categories/reorder', { method: 'POST', body: { items } })
  }

  const reorderChildren = async (_parentId: string, children: Category[]) => {
    const items = children.map((c, i) => ({ id: c.id, order: i }))
    await $fetch('/api/categories/reorder', { method: 'POST', body: { items } })
  }

  return {
    categories,
    tree,
    loading,
    saving,
    fetch,
    create,
    update,
    remove,
    reorderParents,
    reorderChildren,
  }
}
