import type { Database } from '~/types/database.types'

type Category = Database['public']['Tables']['categories']['Row']

type CategoryChild = Pick<Category, 'id' | 'name' | 'slug' | 'icon'>

export type CategoryWithChildren = CategoryChild & {
  children: CategoryChild[]
}

export const useCategories = () => {
  const client = useSupabaseClient<Database>()

  const getNavCategories = async (): Promise<Pick<Category, 'id' | 'name' | 'slug' | 'icon'>[]> => {
    const { data, error } = await client
      .from('categories')
      .select('id, name, slug, icon')
      .eq('section', 'what_to_do')
      .eq('nav_level', 1)
      .order('order')

    if (error) {
      console.error('Error fetching nav categories:', error)
      return []
    }
    return data ?? []
  }

  const getSubcategories = async (parentSlug: string): Promise<Pick<Category, 'id' | 'name' | 'slug' | 'icon'>[]> => {
    const { data: parent } = await client
      .from('categories')
      .select('id')
      .eq('slug', parentSlug)
      .single()

    if (!parent) return []

    const { data, error } = await client
      .from('categories')
      .select('id, name, slug, icon')
      .eq('parent_id', parent.id)
      .order('order')

    if (error) return []
    return data ?? []
  }

  const getNavCategoriesWithChildren = async (): Promise<CategoryWithChildren[]> => {
    const { data, error } = await client
      .from('categories')
      .select('id, name, slug, icon, nav_level, parent_id')
      .eq('section', 'what_to_do')
      .order('order')

    if (error) {
      console.error('Error fetching categories with children:', error)
      return []
    }

    const all = data ?? []
    const parents = all.filter(c => c.nav_level === 1)
    const children = all.filter(c => c.nav_level === 2)

    return parents.map(parent => ({
      id: parent.id,
      name: parent.name,
      slug: parent.slug,
      icon: parent.icon,
      children: children
        .filter(c => c.parent_id === parent.id)
        .map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon,
        }))
    }))
  }

  const categoryOptions = async () => {
    const cats = await getNavCategories()
    return cats.map(c => ({ label: c.name, value: c.slug }))
  }

  return { getNavCategories, getSubcategories, categoryOptions, getNavCategoriesWithChildren }
}