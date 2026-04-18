// app/composables/useCategories.ts
import type { Tables } from '~/types/database.types'

export type Category = Tables<'categories'>

export interface CategoryWithChildren extends Category {
  children: Category[]
}

export const useCategories = () => {
  const toast = useToast()
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const saving = ref(false)

  // Estructura árbol: padres con sus hijos
  const tree = computed<CategoryWithChildren[]>(() => {
    const parents = categories.value
      .filter(c => !c.parent_id)
      .sort((a, b) => a.order - b.order)

    return parents.map(parent => ({
      ...parent,
      children: categories.value
        .filter(c => c.parent_id === parent.id)
        .sort((a, b) => a.order - b.order)
    }))
  })

  const fetch = async () => {
    loading.value = true
    try {
      categories.value = await $fetch<Category[]>('/api/categories')
    } catch (e: any) {
      toast.add({ title: 'Error cargando categorías', description: e.message, color: 'error' })
    } finally {
      loading.value = false
    }
  }

  const create = async (data: Partial<Category>) => {
    saving.value = true
    try {
      await $fetch('/api/categories', { method: 'POST', body: data })
      toast.add({ title: 'Categoría creada', color: 'success' })
      await fetch()
    } catch (e: any) {
      toast.add({ title: 'Error al crear', description: e.message, color: 'error' })
    } finally {
      saving.value = false
    }
  }

  const update = async (id: string, data: Partial<Category>) => {
    saving.value = true
    try {
      await $fetch(`/api/categories/${id}`, { method: 'PUT', body: data })
      toast.add({ title: 'Categoría actualizada', color: 'success' })
      await fetch()
    } catch (e: any) {
      toast.add({ title: 'Error al actualizar', description: e.message, color: 'error' })
    } finally {
      saving.value = false
    }
  }

  const remove = async (id: string) => {
    saving.value = true
    try {
      await $fetch(`/api/categories/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Categoría eliminada', color: 'neutral' })
      await fetch()
    } catch (e: any) {
      toast.add({ title: 'Error al eliminar', description: e.message, color: 'error' })
    } finally {
      saving.value = false
    }
  }

  // Después del drag & drop, recalcula el order y guarda
  const reorderParents = async (newTree: CategoryWithChildren[]) => {
    const items = newTree.map((c, i) => ({ id: c.id, order: i }))
    await $fetch('/api/categories/reorder', { method: 'POST', body: { items } })
  }

  const reorderChildren = async (parentId: string, children: Category[]) => {
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
    reorderChildren
  }
}
