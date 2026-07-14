<script setup>
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  card: { type: Object, required: true },
  scale: { type: Number, required: true },
  selected: { type: Boolean, default: false },
  zIndex: { type: Number, required: true },
  order: { type: Number, default: 0 },
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
        width: Math.max(props.card.minWidth, active.initial.width + dx),
        height: Math.max(props.card.minHeight, active.initial.height + dy),
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
    :class="[`canvas-card--${card.type}`, { 'is-selected': selected }]"
    :data-card-type="card.type"
    :data-accent="card.accent"
    data-canvas-card
    :style="{
      left: `${card.x}px`,
      top: `${card.y}px`,
      width: `${card.width}px`,
      height: `${card.height}px`,
      zIndex,
      '--node-order': order,
    }"
  >
    <button
      type="button"
      class="canvas-card__titlebar"
      :aria-label="`选择并移动 ${card.title}`"
      :aria-pressed="selected"
      @click="selectCard"
      @pointerdown="beginGesture('move', $event)"
      @pointermove="queuePoint"
      @pointerup="finishGesture"
      @pointercancel="cancelGesture"
      @lostpointercapture="cancelGesture"
    >
      <span v-if="card.mark" class="canvas-card__mark" aria-hidden="true">{{ card.mark }}</span>
      <span class="canvas-card__heading">
        <small>{{ card.kicker }}</small>
        <strong>{{ card.title }}</strong>
      </span>
    </button>

    <div class="canvas-card__body">
      <p v-if="card.body && !card.status" class="canvas-card__copy">{{ card.body }}</p>
      <ul v-if="card.items.length" class="canvas-card__chips" aria-label="能力标签">
        <li v-for="item in card.items" :key="item">{{ item }}</li>
      </ul>
      <nav v-if="card.links.length" class="canvas-card__links" :aria-label="`${card.title} 链接`">
        <a
          v-for="link in card.links"
          :key="link.href"
          :href="link.href"
          @pointerdown.stop
          @click.stop
        >{{ link.label }}</a>
      </nav>
      <span v-if="card.status" class="canvas-card__status">
        <i aria-hidden="true"></i>{{ card.body }}
      </span>
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
  overflow: hidden;
  border: 1px solid #9bb6df;
  border-radius: 8px;
  background: #fffdf7;
  box-shadow: none;
  color: #1e2430;
  font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.canvas-card.is-selected {
  outline: 3px solid #315efb;
  outline-offset: 3px;
}

.canvas-card__titlebar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  min-height: 44px;
  align-items: center;
  padding: 14px 16px 10px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: move;
}

.canvas-card__titlebar:focus-visible,
.canvas-card__resize:focus-visible,
.canvas-card a:focus-visible {
  outline: 3px solid #315efb;
  outline-offset: -3px;
}

.canvas-card__heading {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.canvas-card__heading small {
  color: #69707d;
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.25;
}

.canvas-card__heading strong {
  overflow-wrap: anywhere;
  font-size: 17px;
  line-height: 1.3;
}

.canvas-card__mark {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border-radius: 14px;
  background: #315efb;
  color: #fffdf7;
  font: 700 28px/1 "JetBrains Mono", "Fira Code", Consolas, monospace;
}

.canvas-card__body {
  flex: 1;
  min-height: 0;
  padding: 4px 16px 48px;
}

.canvas-card__copy {
  margin: 0 0 12px;
  color: #454c59;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-line;
}

.canvas-card__links a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  border: 1px solid #b9cae5;
  border-radius: 7px;
  padding: 8px 10px;
  color: #315efb;
  font-weight: 700;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}

.canvas-card__links a:hover {
  border-color: #315efb;
  opacity: 0.76;
}

.canvas-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.canvas-card__chips li {
  border: 1px solid #315efb;
  border-radius: 999px;
  padding: 5px 9px;
  color: #1e4bbb;
  font-size: 12px;
  font-weight: 700;
}

.canvas-card__links {
  display: grid;
  gap: 8px;
}

.canvas-card__status {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: #31516f;
  font-weight: 700;
}

.canvas-card__status i {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #3fae78;
}

.canvas-card--identity {
  border: 2px solid #315efb;
  border-radius: 16px;
}

.canvas-card--identity .canvas-card__titlebar {
  grid-template-columns: 84px 1fr;
  padding: 14px 20px 8px;
}

.canvas-card--identity .canvas-card__heading strong {
  font-size: 24px;
}

.canvas-card--identity .canvas-card__body {
  padding: 0 64px 14px 20px;
}

.canvas-card--identity .canvas-card__copy {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
}

.canvas-card--timeline {
  border-left: 3px solid #315efb;
}

.canvas-card--timeline .canvas-card__heading small {
  color: #315efb;
}

.canvas-card--timeline .canvas-card__heading small::before {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border: 2px solid #315efb;
  border-radius: 50%;
  background: #f4d758;
  content: "";
}

.canvas-card--principle {
  border-color: #d8b92f;
  background: #fff9dc;
}

.canvas-card--principle .canvas-card__copy {
  color: #3f3b24;
  font-size: 16px;
  font-weight: 600;
}

.canvas-card--skills {
  background: #fffdf7;
}

.canvas-card--project {
  border-left: 6px solid #315efb;
}

.canvas-card--project .canvas-card__links a {
  border-color: transparent;
  padding-inline: 0;
}

.canvas-card--knowledge .canvas-card__links {
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.canvas-card--status {
  background: #eef4ff;
}

.canvas-card--next {
  border-color: #ef7b45;
  background: #fffaf6;
}

.canvas-card--next .canvas-card__heading small {
  color: #b64a1c;
}

.canvas-card__resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border: 0;
  border-top: 1px solid #9bb6df;
  border-left: 1px solid #9bb6df;
  background: #F4D758;
  color: transparent;
  cursor: nwse-resize;
}

.canvas-card__resize:hover {
  border-color: #315efb;
  opacity: 0.82;
}

@media (prefers-reduced-motion: reduce) {
  .canvas-card,
  .canvas-card :where(a, button) {
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
    transition-duration: 1ms !important;
  }
}
</style>
