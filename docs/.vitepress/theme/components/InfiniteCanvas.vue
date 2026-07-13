<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CanvasCard from './CanvasCard.vue'
import CanvasConnections from './CanvasConnections.vue'
import CanvasControls from './CanvasControls.vue'
import CanvasLayers from './CanvasLayers.vue'
import CanvasMinimap from './CanvasMinimap.vue'
import {
  canvasWheelTransform, clampScale, fitWorldBounds, resolveTouchOwner, screenToWorld,
  touchGesture, zoomAtPoint,
} from './canvasGeometry.mjs'
import {
  captureCardGeometry, createHistory, getCommittedLayout, pushHistory,
  rebaseHistoryTransform, restoreCardGeometry, undoHistory,
} from './canvasHistory.mjs'
import { loadCanvasLayout, saveCanvasLayout } from './canvasPersistence.mjs'
import { canvasCards, canvasConnections } from './personalOsContent.mjs'

const SAVE_DELAY = 250
const INITIAL_TRANSFORM = Object.freeze({ scale: 1, panX: 0, panY: 0 })
const emit = defineEmits(['layout-change'])
const viewport = ref(null)
const cards = ref(canvasCards.map((card) => ({ ...card })))
const transform = ref({ ...INITIAL_TRANSFORM })
const selectedCardId = ref(null)
const stackingOrder = ref(cards.value.map((card) => card.id))
const viewportSize = ref({ width: 1, height: 1 })

const defaultLayout = {
  cards: canvasCards.map((card) => ({ ...card })),
  transform: { ...INITIAL_TRANSFORM },
}
const history = ref(createHistory(defaultLayout))

function boundsFor(cardsToMeasure) {
  const minX = Math.min(...cardsToMeasure.map((card) => card.x))
  const minY = Math.min(...cardsToMeasure.map((card) => card.y))
  const maxX = Math.max(...cardsToMeasure.map((card) => card.x + card.width))
  const maxY = Math.max(...cardsToMeasure.map((card) => card.y + card.height))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

const stableWorldBounds = Object.freeze(boundsFor(defaultLayout.cards))
let pointerGesture = null
let touchBaseline = null
let touchOwner = null
let pendingTransform = null
let frameId = null
let saveTimer = null
let storage
let resizeObserver
let activeCardGesture = null

const worldStyle = computed(() => ({
  transform: `translate(${transform.value.panX}px, ${transform.value.panY}px) scale(${transform.value.scale})`,
}))

function currentLayout() {
  return {
    cards: cards.value.map((card) => ({ ...card })),
    transform: { ...transform.value },
  }
}

function applyLayout(layout) {
  cards.value = layout.cards.map((card) => ({ ...card }))
  transform.value = { ...layout.transform }
}

function syncHistoryPresent() {
  history.value = rebaseHistoryTransform(history.value, transform.value)
}

function zIndexFor(id) {
  return stackingOrder.value.indexOf(id) + 1
}

function emitLayout() {
  emit('layout-change', { cards: cards.value, transform: { ...transform.value } })
}

function cancelScheduledSave() {
  if (saveTimer === null) return
  window.clearTimeout(saveTimer)
  saveTimer = null
}

function scheduleSave() {
  cancelScheduledSave()
  saveTimer = window.setTimeout(() => {
    saveTimer = null
    saveCanvasLayout(storage, getCommittedLayout(history.value))
  }, SAVE_DELAY)
}

function saveNow() {
  cancelScheduledSave()
  saveCanvasLayout(storage, getCommittedLayout(history.value))
}

function applyTransform(nextTransform, persist = true) {
  transform.value = {
    scale: clampScale(nextTransform.scale),
    panX: nextTransform.panX,
    panY: nextTransform.panY,
  }
  syncHistoryPresent()
  emitLayout()
  if (persist) scheduleSave()
}

function applyPendingTransform() {
  frameId = null
  if (!pendingTransform) return
  const nextTransform = pendingTransform
  pendingTransform = null
  applyTransform(nextTransform, false)
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
  syncHistoryPresent()
  scheduleSave()
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
  applyTransform(pointerGesture.transform)
  pointerGesture = null
  if (viewport.value?.hasPointerCapture?.(pointerId)) viewport.value.releasePointerCapture(pointerId)
}

function handleWheel(event) {
  event.preventDefault()
  const point = viewportPoint(event.clientX, event.clientY)
  const currentTransform = pendingTransform ?? transform.value
  queueTransform(canvasWheelTransform(currentTransform, event, point))
  scheduleSave()
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
  const nextOwner = resolveTouchOwner(touchOwner, event.touches, isInteractiveTarget)
  if (nextOwner === 'interactive') {
    if (touchOwner === 'canvas') flushTransform()
    touchOwner = nextOwner
    touchBaseline = null
    return
  }

  touchOwner = nextOwner
  event.preventDefault()
  flushTransform()
  resetTouchBaseline(event.touches)
}

function handleTouchMove(event) {
  const nextOwner = resolveTouchOwner(touchOwner, event.touches, isInteractiveTarget)
  if (nextOwner !== 'canvas') {
    if (touchOwner === 'canvas') flushTransform()
    touchOwner = nextOwner
    touchBaseline = null
    return
  }

  touchOwner = nextOwner
  if (!touchBaseline) {
    resetTouchBaseline(event.touches)
    return
  }
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
  if (touchOwner === 'canvas') {
    event.preventDefault()
    flushTransform()
  }
  touchOwner = resolveTouchOwner(touchOwner, event.touches, isInteractiveTarget)
  touchBaseline = null
  if (touchOwner === 'canvas') resetTouchBaseline(event.touches)
}

function handleTouchCancel(event) {
  if (touchOwner === 'canvas') {
    event.preventDefault()
    flushTransform()
  }
  touchOwner = resolveTouchOwner(touchOwner, event.touches, isInteractiveTarget)
  touchBaseline = null
  if (touchOwner === 'canvas') resetTouchBaseline(event.touches)
}

function selectCard(id) {
  selectedCardId.value = id
  stackingOrder.value = [...stackingOrder.value.filter((cardId) => cardId !== id), id]
}

function updateCardGeometry({ id, geometry }) {
  if (!activeCardGesture || activeCardGesture.id !== id) {
    cancelScheduledSave()
    activeCardGesture = {
      id,
      snapshot: captureCardGeometry(currentLayout(), id),
      completing: false,
    }
  }
  cards.value = cards.value.map((card) => card.id === id ? { ...card, ...geometry } : card)
  emitLayout()
}

function completeCardGesture({ id, changed }) {
  if (!changed) return
  if (activeCardGesture?.id === id) activeCardGesture = null
  history.value = pushHistory(history.value, currentLayout())
  emitLayout()
  scheduleSave()
}

function markCardGestureCompleting(event) {
  if (!activeCardGesture || !event.target.closest?.('[data-canvas-card]')) return
  activeCardGesture.completing = true
}

function cancelCardGesture(event) {
  if (!activeCardGesture || !event.target.closest?.('[data-canvas-card]')) return
  if (event.type === 'lostpointercapture' && activeCardGesture.completing) return
  const restored = restoreCardGeometry(currentLayout(), activeCardGesture.snapshot)
  activeCardGesture = null
  applyLayout(restored)
  emitLayout()
  saveNow()
}

function changeVisibility({ id, visible }) {
  const card = cards.value.find((candidate) => candidate.id === id)
  if (!card || card.visible === visible) return
  cards.value = cards.value.map((candidate) => candidate.id === id
    ? { ...candidate, visible }
    : candidate)
  if (!visible && selectedCardId.value === id) selectedCardId.value = null
  history.value = pushHistory(history.value, currentLayout())
  emitLayout()
  scheduleSave()
}

function focusCard(id) {
  const card = cards.value.find((candidate) => candidate.id === id)
  if (!card || card.visible === false) return
  selectCard(id)
  applyTransform(fitWorldBounds(
    { x: card.x, y: card.y, width: card.width, height: card.height },
    viewportSize.value,
    64,
  ))
}

function navigateToPoint(worldPoint) {
  const scale = clampScale(transform.value.scale)
  applyTransform({
    scale,
    panX: viewportSize.value.width / 2 - worldPoint.x * scale,
    panY: viewportSize.value.height / 2 - worldPoint.y * scale,
  })
}

function zoomBy(multiplier) {
  const point = { x: viewportSize.value.width / 2, y: viewportSize.value.height / 2 }
  applyTransform(zoomAtPoint(transform.value, transform.value.scale * multiplier, point))
}

function zoomIn() {
  zoomBy(1.2)
}

function zoomOut() {
  zoomBy(1 / 1.2)
}

function fitCanvas() {
  applyTransform(fitWorldBounds(stableWorldBounds, viewportSize.value, 64))
}

function undoCanvas() {
  if (history.value.past.length === 0) return
  history.value = undoHistory(history.value)
  applyLayout(history.value.present)
  emitLayout()
  scheduleSave()
}

function restoreDefaults() {
  history.value = pushHistory(history.value, defaultLayout)
  applyLayout(history.value.present)
  selectedCardId.value = null
  stackingOrder.value = defaultLayout.cards.map((card) => card.id)
  emitLayout()
  scheduleSave()
}

function updateViewportSize() {
  const rect = viewport.value?.getBoundingClientRect()
  if (!rect) return
  viewportSize.value = { width: rect.width, height: rect.height }
}

onMounted(() => {
  const target = viewport.value
  try { storage = window.localStorage } catch { storage = undefined }
  const loaded = loadCanvasLayout(storage, defaultLayout) ?? defaultLayout
  history.value = createHistory(loaded)
  applyLayout(history.value.present)
  updateViewportSize()

  target.addEventListener('wheel', handleWheel, { passive: false })
  target.addEventListener('touchstart', handleTouchStart, { passive: false })
  target.addEventListener('touchmove', handleTouchMove, { passive: false })
  target.addEventListener('touchend', handleTouchEnd, { passive: false })
  target.addEventListener('touchcancel', handleTouchCancel, { passive: false })
  if (typeof window.ResizeObserver === 'function') {
    resizeObserver = new window.ResizeObserver(updateViewportSize)
    resizeObserver.observe(target)
  } else {
    window.addEventListener('resize', updateViewportSize)
  }
})

onBeforeUnmount(() => {
  const target = viewport.value
  target?.removeEventListener('wheel', handleWheel)
  target?.removeEventListener('touchstart', handleTouchStart)
  target?.removeEventListener('touchmove', handleTouchMove)
  target?.removeEventListener('touchend', handleTouchEnd)
  target?.removeEventListener('touchcancel', handleTouchCancel)
  resizeObserver?.disconnect()
  window.removeEventListener('resize', updateViewportSize)
  cancelScheduledSave()
  if (frameId !== null) window.cancelAnimationFrame(frameId)
  const pointerId = pointerGesture?.pointerId
  if (pointerId !== undefined && target?.hasPointerCapture?.(pointerId)) {
    target.releasePointerCapture(pointerId)
  }
  frameId = null
  pendingTransform = null
  pointerGesture = null
  touchBaseline = null
  touchOwner = null
  activeCardGesture = null
  storage = undefined
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
      @pointerup.capture="markCardGestureCompleting"
      @pointercancel="cancelPointerPan"
      @pointercancel.capture="cancelCardGesture"
      @lostpointercapture="cancelPointerPan"
      @lostpointercapture.capture="cancelCardGesture"
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
          @gesture-complete="completeCardGesture"
        />
      </div>
    </div>

    <CanvasLayers
      :cards="cards"
      :selected-card-id="selectedCardId"
      @focus="focusCard"
      @visibility="changeVisibility"
    />
    <CanvasMinimap
      :cards="cards"
      :transform="transform"
      :viewport="viewportSize"
      :world-bounds="stableWorldBounds"
      @navigate="navigateToPoint"
    />
    <CanvasControls
      :scale="transform.scale"
      :can-undo="history.past.length > 0"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @fit="fitCanvas"
      @undo="undoCanvas"
      @save="saveNow"
      @reset="restoreDefaults"
    />
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
