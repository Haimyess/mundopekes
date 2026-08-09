<!-- app/pages/categories.vue -->
<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { CategoryWithChildren, Category } from '~/composables/useCategories'

const { t } = useI18n()
const { tree, loading, saving, fetch, create, update, remove, reorderParents, reorderChildren } =
  useCategories()

// Estado del form inline
const editingId = ref<string | null>(null)
const editForm = reactive({ name: '', slug: '', icon: '' })

// Form nuevo padre
const showNewParent = ref(false)
const newParentForm = reactive({ name: '', icon: '' })

// Form nuevo hijo — guardamos el parentId
const showNewChild = ref<string | null>(null)
const newChildForm = reactive({ name: '', icon: '' })

// Auto slug
const toSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// Editar inline
const startEdit = (cat: Category) => {
  editingId.value = cat.id
  editForm.name = cat.name
  editForm.slug = cat.slug
  editForm.icon = cat.icon ?? ''
}

const saveEdit = async () => {
  if (!editingId.value) return
  await update(editingId.value, {
    name: editForm.name,
    slug: editForm.slug || toSlug(editForm.name),
    icon: editForm.icon || null,
  })
  editingId.value = null
}

const cancelEdit = () => {
  editingId.value = null
}

// Crear padre
const createParent = async () => {
  if (!newParentForm.name) return
  await create({
    name: newParentForm.name,
    slug: toSlug(newParentForm.name),
    icon: newParentForm.icon || null,
    parent_id: null,
  })
  newParentForm.name = ''
  newParentForm.icon = ''
  showNewParent.value = false
}

// Abrir el form de nueva subcategoría, limpio
const openNewChildForm = (parentId: string) => {
  showNewChild.value = parentId
  newChildForm.name = ''
  newChildForm.icon = ''
}

// Crear hijo
const createChild = async (parentId: string) => {
  if (!newChildForm.name) return
  await create({
    name: newChildForm.name,
    slug: toSlug(newChildForm.name),
    icon: newChildForm.icon || null,
    parent_id: parentId,
  })
  newChildForm.name = ''
  newChildForm.icon = ''
  showNewChild.value = null
}

// Drag & drop padres
const localTree = ref<CategoryWithChildren[]>([])
watch(
  tree,
  (val) => {
    localTree.value = [...val]
  },
  { immediate: true }
)

const onParentDragEnd = async () => {
  await reorderParents(localTree.value)
}

// Drag & drop hijos
const onChildDragEnd = async (parent: CategoryWithChildren) => {
  await reorderChildren(parent.id, parent.children)
}

await fetch()
</script>

<template>
  <UDashboardPanel :ui="{ body: 'flex flex-col flex-1 overflow-y-auto p-4 gap-3' }">
    <template #header>
      <UDashboardNavbar :title="t('categories.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" @click="showNewParent = true">
            {{ t('categories.newCategory') }}
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="animate-spin size-6 text-muted" />
      </div>

      <template v-else>
        <!-- Form nueva categoría padre -->
        <UCard v-if="showNewParent" class="border-dashed">
          <div class="flex items-center gap-3">
            <UInput v-model="newParentForm.icon" placeholder="i-lucide-tag" class="w-40" />
            <UInput
              v-model="newParentForm.name"
              :placeholder="t('categories.categoryNamePlaceholder')"
              class="flex-1"
              @keyup.enter="createParent"
            />
            <UButton :loading="saving" icon="i-lucide-check" @click="createParent" />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="showNewParent = false"
            />
          </div>
        </UCard>

        <!-- Lista drag & drop de padres -->
        <VueDraggable
          v-model="localTree"
          handle=".drag-handle-parent"
          :animation="150"
          :force-fallback="true"
          ghost-class="opacity-40"
          fallback-class="drag-fallback"
          @end="onParentDragEnd"
        >
          <UCard
            v-for="parent in localTree"
            :key="parent.id"
            class="flex flex-col gap-0 overflow-hidden"
          >
            <!-- Fila del padre -->
            <div class="flex items-center gap-3 p-3">
              <!-- Handle drag padre -->
              <UIcon
                name="i-lucide-grip-vertical"
                class="drag-handle-parent cursor-grab text-muted size-4 shrink-0"
              />

              <!-- Ícono -->
              <UIcon v-if="parent.icon" :name="parent.icon" class="size-5 text-primary shrink-0" />
              <div v-else class="size-5 shrink-0" />

              <!-- Modo edición inline -->
              <template v-if="editingId === parent.id">
                <UInput v-model="editForm.icon" placeholder="i-lucide-tag" class="w-36" />
                <UInput
                  v-model="editForm.name"
                  class="flex-1"
                  @keyup.enter="saveEdit"
                  @keyup.esc="cancelEdit"
                />
                <UButton size="xs" icon="i-lucide-check" :loading="saving" @click="saveEdit" />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  @click="cancelEdit"
                />
              </template>

              <!-- Modo vista — bold/grande/con color para distinguirla de las subcategorías -->
              <template v-else>
                <span class="flex-1 font-bold text-base text-primary">{{ parent.name }}</span>
                <span class="text-xs text-muted">{{ parent.slug }}</span>
                <UBadge color="primary" variant="subtle" size="sm">
                  {{ parent.children.length }} {{ t('categories.subCount') }}
                </UBadge>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-pencil"
                  @click="startEdit(parent)"
                />
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  :loading="saving"
                  @click="remove(parent.id)"
                />
              </template>
            </div>

            <!-- Hijos con su propio drag & drop -->
            <div class="border-t border-default pl-10 flex flex-col">
              <VueDraggable
                v-model="parent.children"
                handle=".drag-handle-child"
                :animation="150"
                :force-fallback="true"
                ghost-class="opacity-40"
                fallback-class="drag-fallback"
                @end="() => onChildDragEnd(parent)"
              >
                <div
                  v-for="child in parent.children"
                  :key="child.id"
                  class="flex items-center gap-3 px-3 py-2 border-b border-default last:border-0"
                >
                  <UIcon
                    name="i-lucide-grip-vertical"
                    class="drag-handle-child cursor-grab text-muted size-3.5 shrink-0"
                  />
                  <UIcon v-if="child.icon" :name="child.icon" class="size-4 text-muted shrink-0" />
                  <div v-else class="size-4 shrink-0" />

                  <template v-if="editingId === child.id">
                    <UInput v-model="editForm.icon" placeholder="i-lucide-tag" class="w-32" />
                    <UInput
                      v-model="editForm.name"
                      class="flex-1"
                      @keyup.enter="saveEdit"
                      @keyup.esc="cancelEdit"
                    />
                    <UButton size="xs" icon="i-lucide-check" :loading="saving" @click="saveEdit" />
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      @click="cancelEdit"
                    />
                  </template>

                  <template v-else>
                    <span class="flex-1 text-sm text-(--ui-text-muted)">{{ child.name }}</span>
                    <span class="text-xs text-muted">{{ child.slug }}</span>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-pencil"
                      @click="startEdit(child)"
                    />
                    <UButton
                      size="xs"
                      color="error"
                      variant="ghost"
                      icon="i-lucide-trash-2"
                      :loading="saving"
                      @click="remove(child.id)"
                    />
                  </template>
                </div>
              </VueDraggable>

              <!-- Agregar subcategoría -->
              <div v-if="showNewChild === parent.id" class="flex items-center gap-3 px-3 py-2">
                <div class="size-3.5 shrink-0" />
                <UInput v-model="newChildForm.icon" placeholder="i-lucide-tag" class="w-32" />
                <UInput
                  v-model="newChildForm.name"
                  :placeholder="t('categories.subcategoryNamePlaceholder')"
                  class="flex-1"
                  @keyup.enter="createChild(parent.id)"
                />
                <UButton
                  size="xs"
                  icon="i-lucide-check"
                  :loading="saving"
                  @click="createChild(parent.id)"
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  @click="showNewChild = null"
                />
              </div>

              <button
                class="flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-primary transition-colors"
                @click="openNewChildForm(parent.id)"
              >
                <UIcon name="i-lucide-plus" class="size-3" />
                {{ t('categories.addSubcategory') }}
              </button>
            </div>
          </UCard>
        </VueDraggable>

        <!-- Vacío -->
        <div v-if="!loading && localTree.length === 0" class="text-center py-12 text-muted text-sm">
          {{ t('categories.empty') }}
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
/* Sortable's forceFallback clone — without this it's still a plain DOM
   clone with no elevation, which reads as "barely there" while dragging.
   force-fallback itself already fixes the native-HTML5-DnD transparency,
   this just makes the picked-up block visually obvious. */
:global(.drag-fallback) {
  opacity: 1 !important;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
  border-radius: var(--ui-radius, 0.5rem);
  background: var(--ui-bg, white);
}
</style>
