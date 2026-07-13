<script setup>
import { computed } from 'vue'
import { connectionEndpoints } from './canvasGeometry.mjs'

const props = defineProps({
  cards: { type: Array, required: true },
  connections: { type: Array, required: true },
})

const lines = computed(() => {
  const cardsById = new Map(props.cards.map((card) => [card.id, card]))

  return props.connections.flatMap((connection) => {
    const fromCard = cardsById.get(connection.from)
    const toCard = cardsById.get(connection.to)
    if (!fromCard || !toCard) return []
    if (fromCard.visible === false || toCard.visible === false) return []

    return [{
      key: `${connection.from}:${connection.to}`,
      ...connectionEndpoints(fromCard, toCard),
    }]
  })
})
</script>

<template>
  <svg
    class="canvas-connections"
    aria-hidden="true"
    focusable="false"
  >
    <line
      v-for="line in lines"
      :key="line.key"
      :x1="line.x1"
      :y1="line.y1"
      :x2="line.x2"
      :y2="line.y2"
    />
  </svg>
</template>

<style scoped>
.canvas-connections {
  position: absolute;
  inset: 0;
  width: 1px;
  height: 1px;
  overflow: visible;
  pointer-events: none;
}

.canvas-connections line {
  stroke: #69707d;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
</style>
