<script setup>
import { computed } from 'vue'

const props = defineProps({
  cards: { type: Array, required: true },
  transform: { type: Object, required: true },
  viewport: { type: Object, required: true },
  worldBounds: { type: Object, required: true },
})

const emit = defineEmits(['navigate'])
const visibleCards = computed(() => props.cards.filter((card) => card.visible !== false))
const viewBox = computed(() => [
  props.worldBounds.x,
  props.worldBounds.y,
  props.worldBounds.width,
  props.worldBounds.height,
].join(' '))
const viewportRect = computed(() => ({
  x: -props.transform.panX / props.transform.scale,
  y: -props.transform.panY / props.transform.scale,
  width: props.viewport.width / props.transform.scale,
  height: props.viewport.height / props.transform.scale,
}))

function navigate(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return
  if (event.detail === 0) {
    emit('navigate', {
      x: props.worldBounds.x + props.worldBounds.width / 2,
      y: props.worldBounds.y + props.worldBounds.height / 2,
    })
    return
  }
  const x = props.worldBounds.x
    + (event.clientX - rect.left) / rect.width * props.worldBounds.width
  const y = props.worldBounds.y
    + (event.clientY - rect.top) / rect.height * props.worldBounds.height
  emit('navigate', { x, y })
}
</script>

<template>
  <aside
    class="canvas-minimap"
    aria-label="画布缩略图"
    data-canvas-control
    @pointerdown.stop
    @wheel.stop
  >
    <button
      type="button"
      class="canvas-minimap__surface"
      aria-label="在缩略图中定位画布"
      @click="navigate"
    >
      <svg :viewBox="viewBox" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <rect
          v-for="card in visibleCards"
          :key="card.id"
          class="canvas-minimap__card"
          :x="card.x"
          :y="card.y"
          :width="card.width"
          :height="card.height"
        />
        <rect
          class="canvas-minimap__viewport"
          :x="viewportRect.x"
          :y="viewportRect.y"
          :width="viewportRect.width"
          :height="viewportRect.height"
        />
      </svg>
    </button>
  </aside>
</template>

<style scoped>
.canvas-minimap {
  position: absolute;
  left: 18px;
  bottom: 82px;
  z-index: 30;
  width: 180px;
  padding: 7px;
  border: 1px solid #1e2430;
  background: #fffdf7;
}

.canvas-minimap__surface {
  display: block;
  width: 100%;
  height: 108px;
  padding: 0;
  border: 1px solid #69707d;
  background: #f7f4ec;
  cursor: crosshair;
  touch-action: manipulation;
}

.canvas-minimap__surface:focus-visible {
  outline: 3px solid #f2c94c;
  outline-offset: 3px;
}

.canvas-minimap svg {
  display: block;
  width: 100%;
  height: 100%;
}

.canvas-minimap__card {
  fill: #315efb;
  stroke: #1e2430;
  stroke-width: 4;
  vector-effect: non-scaling-stroke;
}

.canvas-minimap__viewport {
  fill: none;
  stroke: #ef7b45;
  stroke-width: 5;
  vector-effect: non-scaling-stroke;
}

@media (max-width: 767px) {
  .canvas-minimap {
    left: 10px;
    bottom: 76px;
    width: 132px;
  }

  .canvas-minimap__surface {
    min-height: 44px;
    height: 76px;
  }
}
</style>
