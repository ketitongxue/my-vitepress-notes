<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { resizeCardGeometry } from './canvasGeometry.mjs'

const props = defineProps({
  card: { type: Object, required: true },
  scale: { type: Number, required: true },
  selected: { type: Boolean, default: false },
  zIndex: { type: Number, required: true },
  order: { type: Number, default: 0 },
})

const emit = defineEmits(['select', 'geometry-change', 'gesture-complete'])
const gesture = ref(null)
const resizeEdges = Object.freeze([
  { edge: 'n', label: '顶部', orientation: 'horizontal' },
  { edge: 'e', label: '右侧', orientation: 'vertical' },
  { edge: 's', label: '底部', orientation: 'horizontal' },
  { edge: 'w', label: '左侧', orientation: 'vertical' },
  { edge: 'nw', label: '左上角' },
  { edge: 'ne', label: '右上角' },
  { edge: 'se', label: '右下角' },
  { edge: 'sw', label: '左下角' },
])
let pendingPoint = null
let frameId = null

function selectCard() {
  emit('select', props.card.id)
}

function beginGesture(kind, event, edge = null) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (kind === 'resize') event.preventDefault()
  event.stopPropagation()
  selectCard()
  const target = event.currentTarget
  target.setPointerCapture(event.pointerId)
  gesture.value = {
    kind,
    edge,
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
    : resizeCardGeometry(active.initial, active.edge, { x: dx, y: dy }, {
        minWidth: props.card.minWidth,
        minHeight: props.card.minHeight,
      })

  active.changed = true
  emit('geometry-change', { id: props.card.id, geometry })
}

function handleResizeKey(edge, event) {
  const direction = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
  }[event.key]
  if (!direction) return

  const step = event.shiftKey ? 24 : 8
  const initial = {
    x: props.card.x,
    y: props.card.y,
    width: props.card.width,
    height: props.card.height,
  }
  const geometry = resizeCardGeometry(initial, edge, {
    x: direction.x * step,
    y: direction.y * step,
  }, {
    minWidth: props.card.minWidth,
    minHeight: props.card.minHeight,
  })
  if (Object.keys(initial).every((key) => initial[key] === geometry[key])) return

  event.preventDefault()
  event.stopPropagation()
  selectCard()
  emit('geometry-change', { id: props.card.id, geometry })
  emit('gesture-complete', { id: props.card.id, kind: 'resize', changed: true })
}

function queuePoint(event) {
  const active = gesture.value
  if (!active || event.pointerId !== active.pointerId) return
  if (active.kind === 'resize') event.preventDefault()
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
    :class="[`canvas-card--${card.type}`, {
      'is-selected': selected,
      'is-resizing': gesture?.kind === 'resize',
      'is-moving': gesture?.kind === 'move',
    }]"
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

    <div
      class="canvas-card__body"
      @pointerdown="beginGesture('move', $event)"
      @pointermove="queuePoint"
      @pointerup="finishGesture"
      @pointercancel="cancelGesture"
      @lostpointercapture="cancelGesture"
    >
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

    <span
      v-for="handle in resizeEdges"
      :key="handle.edge"
      class="canvas-card__resize-handle"
      :class="`canvas-card__resize-handle--${handle.edge}`"
      :data-resize-edge="handle.edge"
      role="separator"
      :aria-label="`从${handle.label}调整 ${card.title} 卡片大小`"
      :aria-orientation="handle.orientation"
      :tabindex="selected ? 0 : -1"
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
      @pointerdown="beginGesture('resize', $event, handle.edge)"
      @pointermove="queuePoint"
      @pointerup="finishGesture"
      @pointercancel="cancelGesture"
      @lostpointercapture="cancelGesture"
      @keydown="handleResizeKey(handle.edge, $event)"
    ></span>
  </article>
</template>

<style scoped>
.canvas-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgb(50 105 180 / 65%);
  border-radius: 10px;
  background: #fffdf7;
  box-shadow: 0 5px 14px rgb(35 75 120 / 10%);
  color: #252b36;
  font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.canvas-card:hover {
  border-color: rgb(43 91 157 / 82%);
  box-shadow: 0 7px 18px rgb(35 75 120 / 15%);
}

.canvas-card.is-selected {
  border-width: 2px;
  border-color: #315efb;
  box-shadow: 0 0 0 3px rgb(49 94 251 / 12%), 0 7px 18px rgb(35 75 120 / 15%);
}

.canvas-card.is-resizing {
  border-color: #315efb;
  box-shadow: 0 0 0 2px rgb(49 94 251 / 18%), 0 7px 18px rgb(35 75 120 / 16%);
  user-select: none;
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
.canvas-card__resize-handle:focus-visible,
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
  padding: 4px 16px 16px;
  overflow: hidden;
  cursor: move;
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
  border: 1px solid rgb(50 105 180 / 38%);
  border-radius: 7px;
  background: rgb(255 255 255 / 52%);
  padding: 8px 10px;
  color: #315efb;
  cursor: pointer;
  font-weight: 700;
  box-shadow: 0 2px 6px rgb(35 75 120 / 6%);
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  transition: border-color 170ms ease, box-shadow 170ms ease, transform 170ms ease;
}

.canvas-card__links a:hover {
  border-color: #315efb;
  box-shadow: 0 4px 10px rgb(35 75 120 / 12%);
  transform: translateY(-1px);
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
  padding: 0 20px 16px;
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
  border-color: rgb(188 151 28 / 52%);
  background: #fff9df;
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

.canvas-card--project::before {
  position: absolute;
  top: 8px;
  right: 22px;
  width: 54px;
  height: 14px;
  transform: rotate(1.5deg);
  background: rgb(244 215 88 / 44%);
  content: "";
  pointer-events: none;
}

.canvas-card--project .canvas-card__links a {
  border-color: transparent;
  padding-inline: 0;
}

.canvas-card--knowledge .canvas-card__links {
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.canvas-card--knowledge .canvas-card__links a {
  background: #fffdf7;
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

.canvas-card__resize-handle {
  position: absolute;
  z-index: 5;
  display: block;
  touch-action: none;
  user-select: none;
}

.canvas-card__resize-handle--n,
.canvas-card__resize-handle--s {
  right: 14px;
  left: 14px;
  height: 8px;
}

.canvas-card__resize-handle--n { top: 0; cursor: n-resize; }
.canvas-card__resize-handle--s { bottom: 0; cursor: s-resize; }

.canvas-card__resize-handle--e,
.canvas-card__resize-handle--w {
  top: 14px;
  bottom: 14px;
  width: 8px;
}

.canvas-card__resize-handle--e { right: 0; cursor: e-resize; }
.canvas-card__resize-handle--w { left: 0; cursor: w-resize; }

.canvas-card__resize-handle--nw,
.canvas-card__resize-handle--ne,
.canvas-card__resize-handle--se,
.canvas-card__resize-handle--sw {
  width: 14px;
  height: 14px;
}

.canvas-card__resize-handle--nw { top: 0; left: 0; cursor: nw-resize; }
.canvas-card__resize-handle--ne { top: 0; right: 0; cursor: ne-resize; }
.canvas-card__resize-handle--se { right: 0; bottom: 0; cursor: se-resize; }
.canvas-card__resize-handle--sw { bottom: 0; left: 0; cursor: sw-resize; }

.canvas-card__resize-handle::after {
  position: absolute;
  border-radius: 999px;
  background: transparent;
  content: "";
  pointer-events: none;
  transition: background-color 160ms ease;
}

.canvas-card__resize-handle--n::after,
.canvas-card__resize-handle--s::after {
  right: 3px;
  left: 3px;
  height: 2px;
}

.canvas-card__resize-handle--n::after { top: 0; }
.canvas-card__resize-handle--s::after { bottom: 0; }

.canvas-card__resize-handle--e::after,
.canvas-card__resize-handle--w::after {
  top: 3px;
  bottom: 3px;
  width: 2px;
}

.canvas-card__resize-handle--e::after { right: 0; }
.canvas-card__resize-handle--w::after { left: 0; }

.canvas-card__resize-handle:hover::after,
.canvas-card__resize-handle:focus-visible::after {
  background: rgb(49 94 251 / 46%);
}

.canvas-card.is-selected .canvas-card__resize-handle--nw::after,
.canvas-card.is-selected .canvas-card__resize-handle--ne::after,
.canvas-card.is-selected .canvas-card__resize-handle--se::after,
.canvas-card.is-selected .canvas-card__resize-handle--sw::after {
  width: 5px;
  height: 5px;
  border: 1px solid rgb(49 94 251 / 56%);
  background: rgb(255 253 247 / 72%);
}

.canvas-card.is-selected .canvas-card__resize-handle--nw::after { top: 1px; left: 1px; }
.canvas-card.is-selected .canvas-card__resize-handle--ne::after { top: 1px; right: 1px; }
.canvas-card.is-selected .canvas-card__resize-handle--se::after { right: 1px; bottom: 1px; }
.canvas-card.is-selected .canvas-card__resize-handle--sw::after { bottom: 1px; left: 1px; }

@media (max-width: 767px) {
  .canvas-card__resize-handle--n,
  .canvas-card__resize-handle--w,
  .canvas-card__resize-handle--nw,
  .canvas-card__resize-handle--ne,
  .canvas-card__resize-handle--sw {
    display: none;
  }

  .canvas-card__resize-handle--e {
    width: 14px;
  }

  .canvas-card__resize-handle--s {
    height: 14px;
  }

  .canvas-card__resize-handle--se {
    width: 18px;
    height: 18px;
  }
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
