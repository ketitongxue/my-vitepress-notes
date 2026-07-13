<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CanvasCard from './CanvasCard.vue'
import CanvasConnections from './CanvasConnections.vue'
import { clampScale, screenToWorld, touchGesture, zoomAtPoint } from './canvasGeometry.mjs'
import { canvasCards, canvasConnections } from './personalOsContent.mjs'

const emit = defineEmits(['layout-change'])
const viewport = ref(null)
const cards = ref(canvasCards.map((card) => ({ ...card })))
const transform = ref({ scale: 1, panX: 0, panY: 0 })
const selectedCardId = ref(null)
const stackingOrder = ref(cards.value.map((card) => card.id))

let pointerGesture = null
let touchBaseline = null
let pendingTransform = null
let frameId = null

const worldStyle = computed(() => ({
  transform: `translate(${transform.value.panX}px, ${transform.value.panY}px) scale(${transform.value.scale})`,
}))

function zIndexFor(id) {
  return stackingOrder.value.indexOf(id) + 1
}

function emitLayout() {
  emit('layout-change', { cards: cards.value, transform: { ...transform.value } })
}

function applyPendingTransform() {
  frameId = null
  if (!pendingTransform) return
  transform.value = pendingTransform
  pendingTransform = null
  emitLayout()
}

function queueTransform(nextTransform) {
  pendingTransform = nextTransform
  if (frameId === null) frameId = window.requestAnimationFrame(applyPendingTransform)
}

function flushTransform() {
  if (frameId !== null) {
    window.cancelAnimationFrame(frameId)
    frameId = null
  }
  applyPendingTransform()
}

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest('[data-canvas-card], a, button, [data-canvas-control]'))
}

function viewportPoint(clientX, clientY) {
  const rect = viewport.value.getBoundingClientRect()
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function beginPointerPan(event) {
  if (event.pointerType === 'touch' || (event.pointerType === 'mouse' && event.button !== 0)) return
  if (isInteractiveTarget(event.target)) return
  event.preventDefault()
  viewport.value.setPointerCapture(event.pointerId)
  pointerGesture = {
    pointerId: event.pointerId,
    start: { x: event.clientX, y: event.clientY },
    transform: { ...transform.value },
  }
}

function movePointerPan(event) {
  if (!pointerGesture || pointerGesture.pointerId !== event.pointerId) return
  event.preventDefault()
  queueTransform({
    ...pointerGesture.transform,
    panX: pointerGesture.transform.panX + event.clientX - pointerGesture.start.x,
    panY: pointerGesture.transform.panY + event.clientY - pointerGesture.start.y,
  })
}

function finishPointerPan(event) {
  if (!pointerGesture || pointerGesture.pointerId !== event.pointerId) return
  movePointerPan(event)
  flushTransform()
  const pointerId = pointerGesture.pointerId
  pointerGesture = null
  if (viewport.value?.hasPointerCapture?.(pointerId)) viewport.value.releasePointerCapture(pointerId)
}

function cancelPointerPan(event) {
  if (!pointerGesture || pointerGesture.pointerId !== event.pointerId) return
  pendingTransform = null
  if (frameId !== null) {
    window.cancelAnimationFrame(frameId)
    frameId = null
  }
  const pointerId = pointerGesture.pointerId
  pointerGesture = null
  if (viewport.value?.hasPointerCapture?.(pointerId)) viewport.value.releasePointerCapture(pointerId)
}

function handleWheel(event) {
  if (isInteractiveTarget(event.target)) return
  event.preventDefault()
  const point = viewportPoint(event.clientX, event.clientY)
  const currentTransform = pendingTransform ?? transform.value
  const nextScale = currentTransform.scale * Math.exp(-event.deltaY * 0.001)
  queueTransform(zoomAtPoint(currentTransform, nextScale, point))
}

function resetTouchBaseline(touches) {
  if (touches.length === 1) {
    const point = viewportPoint(touches[0].clientX, touches[0].clientY)
    touchBaseline = { count: 1, point, transform: { ...transform.value } }
    return
  }

  if (touches.length >= 2) {
    const gesture = touchGesture(touches)
    const center = viewportPoint(gesture.center.x, gesture.center.y)
    touchBaseline = {
      count: 2,
      center,
      distance: Math.max(gesture.distance, Number.EPSILON),
      transform: { ...transform.value },
      worldCenter: screenToWorld(center, transform.value),
    }
    return
  }

  touchBaseline = null
}

function handleTouchStart(event) {
  if (!touchBaseline && isInteractiveTarget(event.target)) return
  event.preventDefault()
  flushTransform()
  resetTouchBaseline(event.touches)
}

function handleTouchMove(event) {
  if (!touchBaseline) return
  event.preventDefault()
  if (event.touches.length !== touchBaseline.count) {
    flushTransform()
    resetTouchBaseline(event.touches)
    return
  }

  if (touchBaseline.count === 1) {
    const point = viewportPoint(event.touches[0].clientX, event.touches[0].clientY)
    queueTransform({
      ...touchBaseline.transform,
      panX: touchBaseline.transform.panX + point.x - touchBaseline.point.x,
      panY: touchBaseline.transform.panY + point.y - touchBaseline.point.y,
    })
    return
  }

  const gesture = touchGesture(event.touches)
  const center = viewportPoint(gesture.center.x, gesture.center.y)
  const nextScale = clampScale(
    touchBaseline.transform.scale * gesture.distance / touchBaseline.distance,
  )
  queueTransform({
    scale: nextScale,
    panX: center.x - touchBaseline.worldCenter.x * nextScale,
    panY: center.y - touchBaseline.worldCenter.y * nextScale,
  })
}

function handleTouchEnd(event) {
  if (!touchBaseline) return
  event.preventDefault()
  flushTransform()
  resetTouchBaseline(event.touches)
}

function handleTouchCancel(event) {
  if (!touchBaseline) return
  event.preventDefault()
  flushTransform()
  touchBaseline = null
}

function selectCard(id) {
  selectedCardId.value = id
  stackingOrder.value = [...stackingOrder.value.filter((cardId) => cardId !== id), id]
}

function updateCardGeometry({ id, geometry }) {
  cards.value = cards.value.map((card) => card.id === id ? { ...card, ...geometry } : card)
  emitLayout()
}

onMounted(() => {
  const target = viewport.value
  target.addEventListener('wheel', handleWheel, { passive: false })
  target.addEventListener('touchstart', handleTouchStart, { passive: false })
  target.addEventListener('touchmove', handleTouchMove, { passive: false })
  target.addEventListener('touchend', handleTouchEnd, { passive: false })
  target.addEventListener('touchcancel', handleTouchCancel, { passive: false })
})

onBeforeUnmount(() => {
  const target = viewport.value
  target?.removeEventListener('wheel', handleWheel)
  target?.removeEventListener('touchstart', handleTouchStart)
  target?.removeEventListener('touchmove', handleTouchMove)
  target?.removeEventListener('touchend', handleTouchEnd)
  target?.removeEventListener('touchcancel', handleTouchCancel)
  if (frameId !== null) window.cancelAnimationFrame(frameId)
  const pointerId = pointerGesture?.pointerId
  if (pointerId !== undefined && target?.hasPointerCapture?.(pointerId)) {
    target.releasePointerCapture(pointerId)
  }
  frameId = null
  pendingTransform = null
  pointerGesture = null
  touchBaseline = null
})
</script>

<template>
  <section class="infinite-canvas" aria-label="JuZX OS 无限画布">
    <div
      ref="viewport"
      class="infinite-canvas__viewport"
      @pointerdown="beginPointerPan"
      @pointermove="movePointerPan"
      @pointerup="finishPointerPan"
      @pointercancel="cancelPointerPan"
      @lostpointercapture="cancelPointerPan"
    >
      <div class="infinite-canvas__world" :style="worldStyle">
        <CanvasConnections :cards="cards" :connections="canvasConnections" />
        <CanvasCard
          v-for="card in cards"
          :key="card.id"
          :card="card"
          :scale="transform.scale"
          :selected="selectedCardId === card.id"
          :z-index="zIndexFor(card.id)"
          @select="selectCard"
          @geometry-change="updateCardGeometry"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.infinite-canvas {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #2b7fd8;
}

.infinite-canvas__viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.infinite-canvas__viewport:active {
  cursor: grabbing;
}

.infinite-canvas__world {
  position: absolute;
  inset: 0 auto auto 0;
  width: 1px;
  height: 1px;
  transform-origin: 0 0;
}
</style>
