<script setup lang="ts">
// Atributos a nivel de LUGAR — gratis/pago (entrada general del lugar,
// independiente del precio de cada actividad puntual), baños, y bunker/
// refugio. Confirmado 2026-08-28: stroller-friendly/open-weekends/shade/
// horario se sacaron de Place (quedan sólo en Activity, ver UiActivityFields)
// porque son atributos de la actividad puntual, no del lugar en general. Sin
// i18n propio — todas las etiquetas llegan por prop, igual que el resto de
// los componentes Ui* de este directorio.
const props = defineProps<{
  isFree: boolean
  price: number | null
  hasBathrooms: boolean
  hasSafeRoom: boolean

  label: string
  freeLabel: string
  priceLabel: string
  hasBathroomsLabel: string
  hasSafeRoomLabel: string
}>()

const emit = defineEmits<{
  'update:isFree': [value: boolean]
  'update:price': [value: number | null]
  'update:hasBathrooms': [value: boolean]
  'update:hasSafeRoom': [value: boolean]
}>()

// Gratis/precio son mutuamente excluyentes — misma regla que UiActivityFields.
const isFreeProxy = computed({
  get: () => props.isFree,
  set: (v: boolean) => {
    emit('update:isFree', v)
    if (v) emit('update:price', null)
  },
})
const priceProxy = computed({
  get: () => props.price,
  set: (v: number | null) => {
    emit('update:price', v)
    if (v && v > 0) emit('update:isFree', false)
  },
})
const hasBathroomsProxy = computed({
  get: () => props.hasBathrooms,
  set: (v: boolean) => emit('update:hasBathrooms', v),
})
const hasSafeRoomProxy = computed({
  get: () => props.hasSafeRoom,
  set: (v: boolean) => emit('update:hasSafeRoom', v),
})
</script>

<template>
  <UFormField :label="priceLabel">
    <div class="flex flex-col gap-2 w-full">
      <UCheckbox v-model="isFreeProxy" :label="freeLabel" />
      <UInput
        v-if="!isFreeProxy"
        v-model="priceProxy"
        type="number"
        placeholder="150"
        class="w-full"
      >
        <template #leading>
          <span class="text-muted text-sm">₪</span>
        </template>
      </UInput>
    </div>
  </UFormField>

  <UFormField :label="label">
    <div class="flex flex-col gap-2">
      <UCheckbox v-model="hasBathroomsProxy" :label="hasBathroomsLabel" />
      <UCheckbox v-model="hasSafeRoomProxy" :label="hasSafeRoomLabel" />
    </div>
  </UFormField>
</template>
