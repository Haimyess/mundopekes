<!-- app/components/TableSkeleton.vue -->
<!-- Placeholder para el primer render de una página de listado (tabs +
     filtros + tabla), mientras sus datos reales todavía no llegaron. Se usa
     solo en la carga inicial (loading && sin datos aún) — los refetches por
     filtro/paginación siguen usando el :loading de UTable, que no tapa las
     filas ya visibles. -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number
    columns?: number
    filters?: number
    tabs?: number
    search?: boolean
  }>(),
  {
    rows: 8,
    columns: 5,
    filters: 2,
    tabs: 0,
    search: true,
  }
)
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <div
      class="shrink-0 flex flex-wrap items-center justify-between gap-3 p-4 border-b border-default"
    >
      <div class="flex gap-2 flex-wrap">
        <USkeleton v-if="search" class="h-9 w-64" />
        <template v-if="tabs">
          <USkeleton v-for="i in tabs" :key="`tab-${i}`" class="h-8 w-24 rounded-md" />
        </template>
      </div>
      <div v-if="filters" class="flex gap-2 flex-wrap">
        <USkeleton v-for="i in filters" :key="`filter-${i}`" class="h-9 w-36 rounded-md" />
      </div>
    </div>

    <div class="flex-1 min-h-0 overflow-hidden p-4">
      <div class="flex gap-4 pb-3 border-b border-default">
        <USkeleton
          v-for="i in columns"
          :key="`head-${i}`"
          class="h-4 flex-1"
          :style="{ maxWidth: i === 1 ? '30%' : undefined }"
        />
      </div>
      <div
        v-for="row in rows"
        :key="`row-${row}`"
        class="flex items-center gap-4 py-3 border-b border-default last:border-0"
      >
        <USkeleton
          v-for="col in columns"
          :key="`cell-${row}-${col}`"
          class="h-4 flex-1"
          :style="{ maxWidth: col === 1 ? '30%' : undefined, width: col % 2 === 0 ? '60%' : '80%' }"
        />
      </div>
    </div>
  </div>
</template>
