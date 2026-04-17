<script setup lang="ts">
/**
 * ActivityInfo
 * Orquesta los mini-componentes de info de la actividad.
 * Inspirado en coffeetrail.co.il — secciones tipo card independientes.
 *
 * Mini-componentes hijos:
 *   Activity/InfoHeader      → título, ubicación, badges rápidos
 *   Activity/InfoFeatures    → chips: edad, temporadas, accesibilidad
 *   Activity/InfoSchedule    → horario
 *   Activity/InfoDescription → descripción con "leer más"
 *   Activity/InfoLocation    → lugar + botones de navegación
 */

import type { Activity } from '~/types'

interface Props {
  activity: Activity
}

defineProps<Props>()
</script>

<template>
  <div class="activity-info">

    <!-- ① Header: título, ciudad, badges rápidos -->
    <ActivityInfoHeader :activity="activity" />

    <!-- ② Características: edad, temporadas, features -->
    <!-- <ActivityInfoFeatures :activity="activity" /> -->

    <!-- ③ Horario -->
    <ActivityInfoSchedule
      v-if="activity.schedule"
      :schedule="activity.schedule"
    />

    <!-- ④ Descripción -->
    <ActivityInfoDescription
      v-if="activity.description"
      :description="activity.description"
    />

    <!-- ⑤ Ubicación + navegación -->
    <ActivityInfoLocation
      v-if="activity.place"
      :place="activity.place"
    />

  </div>
</template>

<style scoped>
.activity-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>