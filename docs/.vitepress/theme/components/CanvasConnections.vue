<script setup>
import { computed } from 'vue'
import { IconChevronRight } from '@tabler/icons-vue'
import { connectionEndpoints } from './canvasGeometry.mjs'

const props = defineProps({
  cards: { type: Array, required: true },
  connections: { type: Array, required: true },
  scale: { type: Number, default: 1 },
})

const markerScale = computed(() => 1 / Math.max(props.scale, .01))
const lines = computed(() => {
  const cardsById = new Map(props.cards.map((card) => [card.id, card]))

  return props.connections.flatMap((connection) => {
    const fromCard = cardsById.get(connection.from)
    const toCard = cardsById.get(connection.to)
    if (!fromCard || !toCard) return []
    if (fromCard.visible === false || toCard.visible === false) return []

    const endpoints = connectionEndpoints(fromCard, toCard)
    const dx = endpoints.x2 - endpoints.x1
    const dy = endpoints.y2 - endpoints.y1
    const length = Math.hypot(dx, dy)
    if (length < .01) return []
    const inset = Math.min(4 * markerScale.value, length / 4)

    return [{
      key: `${connection.from}:${connection.to}`,
      ...endpoints,
      startX: endpoints.x1 + dx / length * inset,
      startY: endpoints.y1 + dy / length * inset,
      endX: endpoints.x2 - dx / length * inset,
      endY: endpoints.y2 - dy / length * inset,
      markerTransform: `translate(${(endpoints.x1 + endpoints.x2) / 2} ${(endpoints.y1 + endpoints.y2) / 2}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}) scale(${markerScale.value})`,
      showEndpoints: length * props.scale >= 16,
      showDirection: length * props.scale >= 32,
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
    <g v-for="line in lines" :key="line.key">
      <line :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2" :stroke-width="2 * markerScale" />
      <template v-if="line.showEndpoints">
        <circle class="canvas-connections__endpoint" :cx="line.startX" :cy="line.startY" :r="3 * markerScale" :stroke-width="1.5 * markerScale" />
        <circle class="canvas-connections__endpoint" :cx="line.endX" :cy="line.endY" :r="3 * markerScale" :stroke-width="1.5 * markerScale" />
      </template>
      <g v-if="line.showDirection" class="canvas-connections__direction" :transform="line.markerTransform">
        <circle r="8" />
        <IconChevronRight x="-7" y="-7" :size="14" :stroke-width="2.5" />
      </g>
    </g>
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
  stroke: #897653;
  stroke-linecap: round;
}

.canvas-connections__endpoint {
  fill: var(--os-paper, #fefcf6);
  stroke: #897653;
}

.canvas-connections__direction {
  color: #fffdf7;
}

.canvas-connections__direction > circle {
  fill: #897653;
}
</style>
