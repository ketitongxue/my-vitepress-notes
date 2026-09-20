<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { IconArrowUpRight, IconGripHorizontal } from '@tabler/icons-vue'
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
      <IconGripHorizontal class="canvas-card__grip" :size="17" :stroke="1.5" aria-hidden="true" />
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
        >
          <span>{{ link.label }}</span>
          <IconArrowUpRight :size="15" :stroke="1.7" aria-hidden="true" />
        </a>
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
  border: 1px solid rgb(40 90 135 / 35%);
  border-radius: 18px;
  background: linear-gradient(155deg, #fffdf6, #faf7ed);
  box-shadow: 0 12px 30px rgb(20 65 110 / 22%), inset 0 1px rgb(255 255 255 / 80%);
  color: #1e2430;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.canvas-card:hover {
  border-color: rgb(40 90 135 / 62%);
  box-shadow: 0 16px 34px rgb(20 65 110 / 28%), inset 0 1px rgb(255 255 255 / 80%);
}

.canvas-card.is-selected {
  border-color: #266ba9;
  box-shadow: 0 0 0 3px rgb(247 221 118 / 80%), 0 16px 34px rgb(20 65 110 / 28%);
}

.canvas-card.is-resizing {
  border-color: #266ba9;
  box-shadow: 0 0 0 3px rgb(247 221 118 / 90%), 0 16px 34px rgb(20 65 110 / 28%);
  user-select: none;
}

.canvas-card__titlebar {
  position: relative;
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  min-height: 44px;
  align-items: center;
  padding: 11px 38px 10px 16px;
  border: 0;
  border-bottom: 1px dashed rgb(64 125 180 / 27%);
  background: rgb(255 253 246 / 76%);
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: move;
}

.canvas-card__titlebar:focus-visible,
.canvas-card__resize-handle:focus-visible,
.canvas-card a:focus-visible {
  outline: 3px solid #2f83d6;
  outline-offset: -3px;
}

.canvas-card__heading {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.canvas-card__heading small {
  color: #5c738c;
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .09em;
  line-height: 1.25;
}

.canvas-card__heading strong {
  overflow-wrap: anywhere;
  font-size: 17px;
  font-weight: 650;
  line-height: 1.3;
}

.canvas-card__grip {
  position: absolute;
  top: 50%;
  right: 14px;
  color: #879aac;
  transform: translateY(-50%);
}

.canvas-card__mark {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border: 1px solid rgb(36 103 169 / 36%);
  border-radius: 16px;
  background: linear-gradient(145deg, #59a5ed, #2f83d6);
  box-shadow: inset 0 1px rgb(255 255 255 / 45%), 0 4px 10px rgb(47 131 214 / 18%);
  color: #fff5c7;
  font: 700 24px/1 "Comic Sans MS", "Bradley Hand", "Segoe Print", cursive;
  transform: rotate(-4deg);
}

.canvas-card__body {
  flex: 1;
  min-height: 0;
  padding: 10px 16px 14px;
  overflow: hidden;
  cursor: move;
}

.canvas-card__copy {
  margin: 0 0 10px;
  color: #485465;
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-line;
}

.canvas-card__copy:last-child {
  margin-bottom: 0;
}

.canvas-card__links a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid rgb(64 125 180 / 23%);
  border-radius: 9px;
  background: rgb(255 255 255 / 62%);
  padding: 8px 10px;
  color: #1e5d9e;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  transition: border-color 170ms ease, background-color 170ms ease, transform 170ms ease;
}

.canvas-card__links a svg {
  flex: 0 0 auto;
}

.canvas-card__links a:hover {
  border-color: #2f83d6;
  background: #eef6ff;
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
  border: 1px solid rgb(64 125 180 / 22%);
  border-radius: 8px;
  background: #edf4fa;
  padding: 5px 9px;
  color: #2a5a83;
  font-size: 12px;
  font-weight: 600;
}

.canvas-card__links {
  display: grid;
  gap: 8px;
}

.canvas-card__status {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 1px solid rgb(48 116 89 / 18%);
  border-radius: 999px;
  background: #edf5ed;
  padding: 5px 10px;
  color: #306449;
  font-size: 13px;
  font-weight: 600;
}

.canvas-card__status i {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #3f916b;
  box-shadow: 0 0 0 3px rgb(63 145 107 / 10%);
}

.canvas-card--identity {
  border-color: rgb(40 90 135 / 48%);
  border-radius: 20px;
}

.canvas-card--identity .canvas-card__titlebar {
  grid-template-columns: 58px 1fr;
  gap: 16px;
  padding: 16px 38px 14px 20px;
}

.canvas-card--identity .canvas-card__heading strong {
  color: #286eaf;
  font-size: 27px;
}

.canvas-card--identity .canvas-card__body {
  padding: 14px 20px 16px;
}

.canvas-card--identity .canvas-card__copy {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}

.canvas-card--timeline .canvas-card__heading small {
  color: #286eaf;
}

.canvas-card--timeline .canvas-card__heading small::before {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 7px;
  border-radius: 50%;
  background: #2f83d6;
  content: "";
}

.canvas-card--principle {
  background: linear-gradient(155deg, #fffbed, #fcf4d9);
}

.canvas-card--principle .canvas-card__titlebar {
  background: rgb(247 221 118 / 18%);
}

.canvas-card--principle .canvas-card__copy {
  color: #58513b;
  font-size: 15px;
  line-height: 1.6;
}

.canvas-card--project::before {
  position: absolute;
  z-index: 1;
  top: -4px;
  right: 42px;
  width: 48px;
  height: 12px;
  transform: rotate(2deg);
  background: rgb(244 215 88 / 72%);
  content: "";
  pointer-events: none;
}

.canvas-card--knowledge .canvas-card__links {
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.canvas-card--next .canvas-card__heading small {
  color: #806219;
}

.canvas-card--next .canvas-card__heading small::before {
  margin-right: 5px;
  color: #9a771e;
  content: "✦";
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
  background: rgb(47 131 214 / 60%);
}

.canvas-card.is-selected .canvas-card__resize-handle--nw::after,
.canvas-card.is-selected .canvas-card__resize-handle--ne::after,
.canvas-card.is-selected .canvas-card__resize-handle--se::after,
.canvas-card.is-selected .canvas-card__resize-handle--sw::after {
  width: 5px;
  height: 5px;
  border: 1px solid rgb(47 131 214 / 76%);
  background: #fffdf6;
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
