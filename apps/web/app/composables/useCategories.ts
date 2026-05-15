import type { Database } from '~/types/database.types'
import { useI18nContent } from '~/composables/useI18nContent'

type CategoryChild = {
  id: string
  name_i18n: Record<string, string>
  slug: string
  icon: string | null
}

export type CategoryWithChildren = CategoryChild & {
  children: CategoryChild[]
}

export const useCategories = () => {
  const client = useSupabaseClient<Database>()
  const { tc } = useI18nContent()

  const getNavCategories = async (): Promise<CategoryChild[]> => {
    const { data, error } = await client
      .from('categories')
      .select('id, name_i18n, slug, icon')
      .eq('section', 'what_to_do')
      .eq('nav_level', 1)
      .order('order')

    if (error) {
      console.error('Error fetching nav categories:', error)
      return []
    }
    return (data ?? []) as unknown as CategoryChild[]
  }

  const getSubcategories = async (parentSlug: string): Promise<CategoryChild[]> => {
    const { data: parent } = await client
      .from('categories')
      .select('id')
      .eq('slug', parentSlug)
      .single()

    if (!parent) return []

    const { data, error } = await client
      .from('categories')
      .select('id, name_i18n, slug, icon')
      .eq('parent_id', parent.id)
      .order('order')

    if (error) return []
    return (data ?? []) as unknown as CategoryChild[]
  }

  const getNavCategoriesWithChildren = async (): Promise<CategoryWithChildren[]> => {
    const { data, error } = await client
      .from('categories')
      .select('id, name_i18n, slug, icon, nav_level, parent_id')
      .eq('section', 'what_to_do')
      .order('order')

    if (error) {
      console.error('Error fetching categories with children:', error)
      return []
    }

    const all = (data ?? []) as unknown as (CategoryChild & {
      nav_level: number
      parent_id: string | null
    })[]
    const parents = all.filter((c) => c.nav_level === 1)
    const children = all.filter((c) => c.nav_level === 2)

    return parents.map((parent) => ({
      id: parent.id,
      name_i18n: parent.name_i18n,
      slug: parent.slug,
      icon: parent.icon,
      children: children
        .filter((c) => c.parent_id === parent.id)
        .map((c) => ({
          id: c.id,
          name_i18n: c.name_i18n,
          slug: c.slug,
          icon: c.icon,
        })),
    }))
  }

  const categoryOptions = async () => {
    const cats = await getNavCategories()
    return cats.map((c) => ({ label: tc(c.name_i18n), value: c.slug, name_i18n: c.name_i18n }))
  }

  return { getNavCategories, getSubcategories, categoryOptions, getNavCategoriesWithChildren }
}
