<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { IconHandMove, IconSparkles } from '@tabler/icons-vue'
import DesktopAtmosphere from './DesktopAtmosphere.vue'
import CanvasCard from './CanvasCard.vue'
import CanvasConnections from './CanvasConnections.vue'
import CanvasControls from './CanvasControls.vue'
import CanvasLayers from './CanvasLayers.vue'
import {
  canvasUsableViewport, canvasWheelTransform, clampScale, computeWorldBounds, fitWorldBounds,
  initialFitCards, resolveTouchOwner, screenToWorld, touchGesture, zoomAtPoint,
} from './canvasGeometry.mjs'
import {
  captureCardGeometry, createHistory, getCommittedLayout, pushHistory,
  rebaseHistoryTransform, restoreCardGeometry, undoHistory,
} from './canvasHistory.mjs'
import { loadCanvasLayout, saveCanvasLayout } from './canvasPersistence.mjs'

const props = defineProps({
  configuration: { type: Object, required: true },
  brand: { type: String, default: 'AI 纪元' },
  active: { type: Boolean, default: false },
})

const SAVE_DELAY = 250
const INITIAL_TRANSFORM = Object.freeze({ scale: 1, panX: 0, panY: 0 })
const emit = defineEmits(['layout-change'])
const viewport = ref(null)
const atmosphere = ref(null)
const sourceCards = props.configuration.config.cards
const sourceConnections = props.configuration.config.connections
const contentRevision = props.configuration.revision
const cards = ref(sourceCards.map((card) => ({ ...card })))
const transform = ref({ ...INITIAL_TRANSFORM })
const selectedCardId = ref(null)
const stackingOrder = ref(cards.value.map((card) => card.id))
const viewportSize = ref({ width: 1, height: 1 })
const ready = ref(false)
const visibleCount = computed(() => cards.value.filter((card) => card.visible !== false).length)

const defaultLayout = {
  contentRevision,
  cards: sourceCards.map((card) => ({ ...card })),
  order: sourceCards.map(({ id }) => id),
  transform: { ...INITIAL_TRANSFORM },
}
const history = ref(createHistory(defaultLayout))
const canonicalBounds = Object.freeze(computeWorldBounds(
  defaultLayout.cards,
  { x: 0, y: 0, width: 2400, height: 1200 },
  96,
))
const worldBounds = computed(() => computeWorldBounds(cards.value, canonicalBounds, 96))
const mobileViewport = computed(() => viewportSize.value.width < 768)
const usableViewport = computed(() => canvasUsableViewport(viewportSize.value, mobileViewport.value))
let pointerGesture = null
let touchBaseline = null
let touchOwner = null
let pendingTransform = null
let frameId = null
let saveTimer = null
let storage
let resizeObserver
let activeCardGesture = null
let initialLayoutResolved = false
let readyFrame = null

const worldStyle = computed(() => ({
  transform: `translate(${transform.value.panX}px, ${transform.value.panY}px) scale(${transform.value.scale})`,
}))

function currentLayout() {
  return {
    contentRevision,
    cards: cards.value.map((card) => ({ ...card })),
    order: [...stackingOrder.value],
    transform: { ...transform.value },
  }
}

function applyLayout(layout) {
  cards.value = layout.cards.map((card) => ({ ...card }))
  stackingOrder.value = [...layout.order]
  transform.value = { ...layout.transform }
}

function syncHistoryPresent() {
  const rebased = rebaseHistoryTransform(history.value, transform.value)
  history.value = {
    ...rebased,
    present: { ...rebased.present, order: [...stackingOrder.value] },
  }
}

function zIndexFor(id) {
  return stackingOrder.value.indexOf(id) + 1
}

function emitLayout() {
  emit('layout-change', currentLayout())
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
  syncHistoryPresent()
  emitLayout()
  scheduleSave()
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
    usableViewport.value,
    mobileViewport.value ? 8 : 32,
  ))
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
  applyTransform(fitWorldBounds(worldBounds.value, usableViewport.value, 24))
}

function fitInitialLayout() {
  const firstFitBounds = computeWorldBounds(
    initialFitCards(cards.value, mobileViewport.value),
    canonicalBounds,
    mobileViewport.value ? 12 : 96,
  )
  applyTransform(fitWorldBounds(firstFitBounds, usableViewport.value, mobileViewport.value ? 8 : 24))
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
  emitLayout()
  fitCanvas()
}

function updateViewportSize() {
  const rect = viewport.value?.getBoundingClientRect()
  if (!rect || rect.width <= 0 || rect.height <= 0) return
  viewportSize.value = { width: rect.width, height: rect.height }
  initializeLayout()
}

function initializeLayout() {
  if (initialLayoutResolved || viewportSize.value.width <= 0 || viewportSize.value.height <= 0) return
  const loaded = loadCanvasLayout(storage, defaultLayout)
  initialLayoutResolved = true
  history.value = createHistory(loaded ?? defaultLayout)
  applyLayout(history.value.present)
  if (!loaded) fitInitialLayout()
}

onMounted(() => {
  const target = viewport.value
  try { storage = window.localStorage } catch { storage = undefined }
  updateViewportSize()
  readyFrame = window.requestAnimationFrame(() => {
    readyFrame = null
    ready.value = true
  })

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
  if (readyFrame !== null) window.cancelAnimationFrame(readyFrame)
  const pointerId = pointerGesture?.pointerId
  if (pointerId !== undefined && target?.hasPointerCapture?.(pointerId)) {
    target.releasePointerCapture(pointerId)
  }
  frameId = null
  readyFrame = null
  pendingTransform = null
  pointerGesture = null
  touchBaseline = null
  touchOwner = null
  activeCardGesture = null
  storage = undefined
})
</script>

<template>
  <section
    class="infinite-canvas"
    :class="{ 'is-ready': ready }"
    aria-label="AI 纪元无限画布"
    aria-describedby="canvas-instructions"
    @pointermove.passive="atmosphere?.movePointer($event)"
    @pointerleave="atmosphere?.clearPointer()"
  >
    <DesktopAtmosphere ref="atmosphere" :active="active" />
    <header class="infinite-canvas__menu" data-canvas-control>
      <a class="infinite-canvas__brand" href="#home">{{ brand }}</a>
      <span class="infinite-canvas__menu-title">个人工作台</span>
      <span class="infinite-canvas__count"><IconSparkles :size="13" aria-hidden="true" />{{ visibleCount }} 个节点</span>
    </header>
    <div class="infinite-canvas__intro">
      <h1>我的 OS<span aria-hidden="true">✳</span></h1>
      <p>把经历、方法与探索，连接成自己的系统。</p>
    </div>
    <p id="canvas-instructions" class="infinite-canvas__instructions">
      拖动画布浏览，滚轮或双指缩放；也可通过图层聚焦节点，通过适应按钮恢复全局视图。
    </p>
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
        <CanvasConnections :cards="cards" :connections="sourceConnections" />
        <CanvasCard
          v-for="(card, index) in cards"
          :key="card.id"
          :card="card"
          :order="index"
          :scale="transform.scale"
          :selected="selectedCardId === card.id"
          :z-index="zIndexFor(card.id)"
          @select="selectCard"
          @geometry-change="updateCardGeometry"
          @gesture-complete="completeCardGesture"
        />
      </div>
    </div>

    <p class="infinite-canvas__hint" aria-hidden="true">
      <IconHandMove :size="16" />拖动探索<span>·</span>滚轮缩放<span>·</span>图层定位
    </p>

    <CanvasLayers
      :cards="cards"
      :selected-card-id="selectedCardId"
      @focus="focusCard"
      @visibility="changeVisibility"
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
  width: 100%;
  max-width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--os-wallpaper);
  color: #fffdf7;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  isolation: isolate;
}

.infinite-canvas__menu {
  position: absolute;
  z-index: 20;
  inset: 0 0 auto;
  display: flex;
  height: 40px;
  align-items: center;
  gap: 20px;
  padding: 0 18px;
  border-bottom: 1px solid rgb(255 255 255 / 12%);
  background: rgb(47 131 214 / 88%);
  font-size: 11px;
}

.infinite-canvas__menu .infinite-canvas__brand {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  color: #f4d758;
  font: 700 15px/1 "Comic Sans MS", "Bradley Hand", "Segoe Print", cursive;
  text-decoration: none;
}

.infinite-canvas__brand:focus-visible {
  outline: 3px solid #f4d758;
  outline-offset: -3px;
}

.infinite-canvas__menu-title {
  border-left: 1px solid rgb(255 255 255 / 24%);
  padding-left: 20px;
}

.infinite-canvas__count {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.infinite-canvas__count svg {
  color: #f4d758;
}

.infinite-canvas__intro {
  position: absolute;
  z-index: 2;
  top: 68px;
  left: 26px;
  pointer-events: none;
}

.infinite-canvas__intro h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -.04em;
  line-height: 1.2;
}

.infinite-canvas__intro h1 span {
  color: #f4d758;
  font-size: 22px;
}

.infinite-canvas__intro p {
  margin: 10px 0 0;
  color: #f2f6fd;
  font-size: 12px;
  line-height: 1.6;
}

.infinite-canvas__hint {
  position: absolute;
  bottom: 29px;
  left: 26px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #f2f6fd;
  font-size: 11px;
  pointer-events: none;
}

.infinite-canvas__instructions {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.infinite-canvas__viewport {
  position: absolute;
  z-index: 1;
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

.infinite-canvas:not(.is-ready) :deep(.canvas-card) {
  opacity: 0;
}

.infinite-canvas.is-ready :deep(.canvas-card) {
  animation: canvas-node-enter 360ms cubic-bezier(.16, 1, .3, 1) both;
  animation-delay: calc(var(--node-order) * 55ms);
}

@keyframes canvas-node-enter {
  from {
    opacity: 0;
    transform: translateY(8px) scale(.995);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 1100px) {
  .infinite-canvas__hint { display: none; }
}

@media (max-width: 767px) {
  .infinite-canvas__menu {
    height: 48px;
    padding-inline: 12px;
    gap: 12px;
  }

  .infinite-canvas__menu .infinite-canvas__brand { min-height: 44px; }
  .infinite-canvas__menu-title { padding-left: 12px; }
  .infinite-canvas__intro { top: 66px; left: 16px; }
  .infinite-canvas__intro h1 { font-size: 24px; }
  .infinite-canvas__intro p { margin-top: 6px; font-size: 11px; }
}

@media (max-height: 559px) and (orientation: landscape) {
  .infinite-canvas__intro { top: 66px; }
  .infinite-canvas__intro h1 { font-size: 22px; }
  .infinite-canvas__intro p { display: none; }
  .infinite-canvas__hint { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .infinite-canvas:not(.is-ready) :deep(.canvas-card) {
    opacity: 1;
  }

  .infinite-canvas.is-ready :deep(.canvas-card) {
    animation: none;
  }

  .infinite-canvas,
  .infinite-canvas *,
  .canvas-layers,
  .canvas-controls {
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
</style>
