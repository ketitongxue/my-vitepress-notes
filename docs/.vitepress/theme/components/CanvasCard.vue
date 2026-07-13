<script setup>
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  card: { type: Object, required: true },
  scale: { type: Number, required: true },
  selected: { type: Boolean, default: false },
  zIndex: { type: Number, required: true },
})

const emit = defineEmits(['select', 'geometry-change', 'gesture-complete'])
const gesture = ref(null)
let pendingPoint = null
let frameId = null

function selectCard() {
  emit('select', props.card.id)
}

function beginGesture(kind, event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  event.stopPropagation()
  selectCard()
  const target = event.currentTarget
  target.setPointerCapture(event.pointerId)
  gesture.value = {
    kind,
    pointerId: event.pointerId,
    target,
    startX: event.clientX,
    startY: event.clientY,
    initial: {
      x: props.card.x,
      y: props.card.y,
      width: props.card.width,
      height: props.card.height,
    },
    lastPoint: null,
    changed: false,
  }
  pendingPoint = null
}

function applyPoint() {
  frameId = null
  const active = gesture.value
  const point = pendingPoint
  pendingPoint = null
  if (!active || !point) return
  if (active.lastPoint?.x === point.x && active.lastPoint?.y === point.y) return
  active.lastPoint = point

  const dx = (point.x - active.startX) / props.scale
  const dy = (point.y - active.startY) / props.scale
  if (dx === 0 && dy === 0) return
  const geometry = active.kind === 'move'
    ? {
        x: active.initial.x + dx,
        y: active.initial.y + dy,
        width: active.initial.width,
        height: active.initial.height,
      }
    : {
        x: active.initial.x,
        y: active.initial.y,
        width: Math.max(180, active.initial.width + dx),
        height: Math.max(120, active.initial.height + dy),
      }

  active.changed = true
  emit('geometry-change', { id: props.card.id, geometry })
}

function queuePoint(event) {
  const active = gesture.value
  if (!active || event.pointerId !== active.pointerId) return
  event.stopPropagation()
  pendingPoint = { x: event.clientX, y: event.clientY }
  if (frameId === null) frameId = window.requestAnimationFrame(applyPoint)
}

function cancelFrame() {
  if (frameId === null) return
  window.cancelAnimationFrame(frameId)
  frameId = null
}

function finishGesture(event) {
  const active = gesture.value
  if (!active || event.pointerId !== active.pointerId) return
  event.stopPropagation()
  pendingPoint = { x: event.clientX, y: event.clientY }
  cancelFrame()
  applyPoint()

  const completed = { id: props.card.id, kind: active.kind, changed: active.changed }
  gesture.value = null
  if (active.target.hasPointerCapture?.(active.pointerId)) {
    active.target.releasePointerCapture(active.pointerId)
  }
  if (completed.changed) emit('gesture-complete', completed)
}

function cancelGesture(event) {
  const active = gesture.value
  if (!active || event.pointerId !== active.pointerId) return
  event.stopPropagation()
  cancelFrame()
  pendingPoint = null
  gesture.value = null
  if (active.target.hasPointerCapture?.(active.pointerId)) {
    active.target.releasePointerCapture(active.pointerId)
  }
}

onBeforeUnmount(() => {
  const active = gesture.value
  cancelFrame()
  pendingPoint = null
  gesture.value = null
  if (active?.target.hasPointerCapture?.(active.pointerId)) {
    active.target.releasePointerCapture(active.pointerId)
  }
})
</script>

<template>
  <article
    v-show="card.visible !== false"
    class="canvas-card"
    :class="{ 'is-selected': selected }"
    :data-accent="card.accent"
    data-canvas-card
    :style="{
      left: `${card.x}px`,
      top: `${card.y}px`,
      width: `${card.width}px`,
      height: `${card.height}px`,
      zIndex,
    }"
  >
    <button
      type="button"
      class="canvas-card__titlebar"
      :aria-label="`选择并移动 ${card.title}`"
      @click="selectCard"
      @pointerdown="beginGesture('move', $event)"
      @pointermove="queuePoint"
      @pointerup="finishGesture"
      @pointercancel="cancelGesture"
      @lostpointercapture="cancelGesture"
    >
      <span>{{ card.kicker }}</span>
      <strong>{{ card.title }}</strong>
    </button>

    <div class="canvas-card__body">
      <p>{{ card.body }}</p>
      <a
        v-if="card.href"
        :href="card.href"
        @pointerdown.stop
        @click.stop
      >打开内容 →</a>
    </div>

    <button
      type="button"
      class="canvas-card__resize"
      :aria-label="`调整 ${card.title} 卡片大小`"
      @pointerdown="beginGesture('resize', $event)"
      @pointermove="queuePoint"
      @pointerup="finishGesture"
      @pointercancel="cancelGesture"
      @lostpointercapture="cancelGesture"
    >调整大小</button>
  </article>
</template>

<style scoped>
.canvas-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  min-height: 120px;
  overflow: hidden;
  border: 1px solid #1e2430;
  border-radius: 5px;
  background: #fffdf7;
  color: #1e2430;
}

.canvas-card.is-selected {
  outline: 3px solid #315efb;
  outline-offset: 2px;
}

.canvas-card__titlebar {
  display: grid;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid #1e2430;
  background: #f7f4ec;
  color: inherit;
  text-align: left;
  cursor: move;
  touch-action: none;
}

.canvas-card__titlebar:focus-visible,
.canvas-card__resize:focus-visible,
.canvas-card a:focus-visible {
  outline: 3px solid #315efb;
  outline-offset: -3px;
}

.canvas-card__titlebar span {
  color: #69707d;
  font-size: 11px;
}

.canvas-card__body {
  flex: 1;
  padding: 12px;
}

.canvas-card__body p {
  margin: 0 0 12px;
}

.canvas-card__body a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  color: #315efb;
  font-weight: 700;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}

.canvas-card__resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border: 0;
  border-top: 1px solid #1e2430;
  border-left: 1px solid #1e2430;
  background: #f2c94c;
  color: transparent;
  cursor: nwse-resize;
  touch-action: none;
}

@media (prefers-reduced-motion: reduce) {
  .canvas-card,
  .canvas-card :where(a, button) {
    transition: none !important;
  }
}
</style>
