<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  closeWindow,
  focusWindow,
  moveWindow,
  resizeWindowFromEdge,
  toggleMaximizeWindow,
} from './windowManagerState.mjs'

const props = defineProps({
  state: { type: Object, required: true },
  bounds: { type: Object, required: true },
})

const emit = defineEmits(['update:state'])
const manipulation = ref(null)
const isManipulating = computed(() => Boolean(manipulation.value))
let pendingPoint = null
let frameId = null

const closeLabel = (title) => `关闭 ${title}`
const maximizeLabel = (item) => `${item.maximized ? '还原' : '放大'} ${titleFor(item)}`
const resizeEdges = Object.freeze([
  { edge: 'n', label: '顶部' },
  { edge: 'e', label: '右侧' },
  { edge: 's', label: '底部' },
  { edge: 'w', label: '左侧' },
  { edge: 'nw', label: '左上角' },
  { edge: 'ne', label: '右上角' },
  { edge: 'se', label: '右下角' },
  { edge: 'sw', label: '左下角' },
])

function titleFor(item) {
  return item.entry.window.title
}

function updateState(state) {
  emit('update:state', state)
}

function focus(id) {
  updateState(focusWindow(props.state, id))
}

function close(id) {
  updateState(closeWindow(props.state, id))
}

function toggleMaximize(id) {
  updateState(toggleMaximizeWindow(props.state, id, props.bounds))
}

function handleResizeKey(item, edge, event) {
  const direction = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
  }[event.key]
  if (!direction) return
  const step = event.shiftKey ? 32 : 8
  const nextState = resizeWindowFromEdge(
    props.state,
    item.id,
    edge,
    { x: direction.x * step, y: direction.y * step },
    props.bounds,
  )
  if (nextState === props.state) return
  event.preventDefault()
  updateState(nextState)
}

function beginManipulation(kind, item, event, edge = null) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (item.maximized) return
  const target = event.currentTarget
  target.setPointerCapture(event.pointerId)
  manipulation.value = {
    kind,
    edge,
    id: item.id,
    pointerId: event.pointerId,
    target,
    start: { x: event.clientX, y: event.clientY },
    initial: {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    },
  }
  pendingPoint = null
}

function flushManipulation() {
  frameId = null
  const active = manipulation.value
  const point = pendingPoint
  pendingPoint = null
  if (!active || !point) return

  const dx = point.x - active.start.x
  const dy = point.y - active.start.y
  if (active.kind === 'move') {
    updateState(moveWindow(
      props.state,
      active.id,
      { x: active.initial.x + dx, y: active.initial.y + dy },
      props.bounds,
    ))
    return
  }

  const baselineState = {
    ...props.state,
    windows: props.state.windows.map((item) => item.id === active.id
      ? { ...item, ...active.initial }
      : item),
  }
  updateState(resizeWindowFromEdge(
    baselineState,
    active.id,
    active.edge,
    { x: dx, y: dy },
    props.bounds,
  ))
}

function queueManipulation(event) {
  const active = manipulation.value
  if (!active || event.pointerId !== active.pointerId) return
  pendingPoint = { x: event.clientX, y: event.clientY }
  if (frameId === null) frameId = window.requestAnimationFrame(flushManipulation)
}

function cancelFrame() {
  if (frameId === null) return
  window.cancelAnimationFrame(frameId)
  frameId = null
}

function endManipulation(event) {
  const active = manipulation.value
  if (!active || event.pointerId !== active.pointerId) return
  pendingPoint = { x: event.clientX, y: event.clientY }
  cancelFrame()
  flushManipulation()
  if (active.target.hasPointerCapture?.(active.pointerId)) {
    active.target.releasePointerCapture(active.pointerId)
  }
  manipulation.value = null
}

function cancelManipulation(event) {
  const active = manipulation.value
  if (!active || event.pointerId !== active.pointerId) return
  cancelFrame()
  pendingPoint = null
  if (active.target.hasPointerCapture?.(active.pointerId)) {
    active.target.releasePointerCapture(active.pointerId)
  }
  manipulation.value = null
}

onBeforeUnmount(() => {
  cancelFrame()
  pendingPoint = null
  manipulation.value = null
})
</script>

<template>
  <div class="window-manager" :class="{ 'is-manipulating': isManipulating }">
    <article
      v-for="item in state.windows"
      :key="item.id"
      class="window-manager__window"
      :class="{
        'window-manager__window--project': item.id === 'projects',
        'is-maximized': item.maximized,
      }"
      :style="{
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        zIndex: item.z,
      }"
      @pointerdown="focus(item.id)"
    >
      <header
        class="window-manager__titlebar"
        @pointerdown="beginManipulation('move', item, $event)"
        @pointermove="queueManipulation"
        @pointerup="endManipulation"
        @pointercancel="cancelManipulation"
      >
        <span class="window-manager__traffic-lights">
          <button
            type="button"
            class="window-manager__traffic-control window-manager__traffic-control--close"
            :aria-label="closeLabel(titleFor(item))"
            @pointerdown.stop="focus(item.id)"
            @click="close(item.id)"
          ><span aria-hidden="true">×</span></button>
          <button
            type="button"
            class="window-manager__traffic-control window-manager__traffic-control--zoom"
            :aria-label="maximizeLabel(item)"
            :aria-pressed="Boolean(item.maximized)"
            @pointerdown.stop="focus(item.id)"
            @click="toggleMaximize(item.id)"
          ><span aria-hidden="true">{{ item.maximized ? '↙' : '＋' }}</span></button>
        </span>
        <strong>{{ titleFor(item) }}</strong>
      </header>

      <span class="window-manager__tape" aria-hidden="true"></span>
      <span class="window-manager__sparkle" aria-hidden="true">✦</span>
      <div class="window-manager__preview">
        <p>{{ item.entry.window.summary }}</p>
        <a
          v-if="item.entry.window.href"
          :href="item.entry.window.href"
          :target="item.entry.window.external ? '_blank' : undefined"
          :rel="item.entry.window.external ? 'noopener noreferrer' : undefined"
        >前往 {{ titleFor(item) }}</a>
        <div v-else class="window-manager__status">
          <span>整理中</span>
          <p>内容持续完善</p>
        </div>
      </div>

      <span
        v-for="handle in item.maximized ? [] : resizeEdges"
        :key="handle.edge"
        class="window-manager__resize-handle"
        :class="`window-manager__resize-handle--${handle.edge}`"
        :data-resize-edge="handle.edge"
        role="separator"
        :tabindex="handle.edge === 'se' ? 0 : -1"
        :aria-label="`从${handle.label}调整 ${titleFor(item)} 窗口大小`"
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
        @pointerdown="beginManipulation('resize', item, $event, handle.edge)"
        @pointermove="queueManipulation"
        @pointerup="endManipulation"
        @pointercancel="cancelManipulation"
        @keydown="handleResizeKey(item, handle.edge, $event)"
      ></span>
    </article>
  </div>
</template>

<style scoped>
.window-manager {
  position: absolute;
  z-index: 5;
  inset: 0;
  pointer-events: none;
}

.window-manager__window {
  position: absolute;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: 54px 1fr;
  overflow: hidden;
  min-width: 360px;
  min-height: 260px;
  border: 1px solid rgb(40 90 135 / 35%);
  border-radius: 20px;
  background:
    linear-gradient(rgb(255 253 246 / 94%), rgb(250 247 237 / 98%)),
    repeating-linear-gradient(0deg, transparent 0 25px, rgb(49 94 138 / 3%) 25px 26px);
  color: #1e2430;
  box-shadow: 0 12px 30px rgb(20 65 110 / 25%);
  pointer-events: auto;
}

.window-manager__window.is-maximized {
  border-radius: 0;
  box-shadow: none;
}

.window-manager__titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 10px 0 18px;
  border-bottom: 1px dashed rgb(64 125 180 / 30%);
  background: rgb(255 253 246 / 76%);
  touch-action: none;
  user-select: none;
  cursor: move;
}

.window-manager__titlebar strong {
  flex: 1;
  overflow: hidden;
  color: #2d6fb5;
  font-family: "Comic Sans MS", "Bradley Hand", "Segoe Print", cursive;
  font-size: 17px;
  letter-spacing: .01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-manager__traffic-lights {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0;
}

.window-manager__traffic-control {
  position: relative;
  display: inline-grid;
  width: 36px;
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgb(30 36 48 / 64%);
  cursor: default;
  font: 700 11px/1 "JetBrains Mono", "Fira Code", Consolas, monospace;
}

.window-manager__traffic-control::before {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1px solid rgb(30 36 48 / 18%);
  border-radius: 50%;
  box-shadow: inset 0 1px rgb(255 255 255 / 42%);
  content: "";
}

.window-manager__traffic-control span {
  position: relative;
  z-index: 1;
  opacity: 0;
  transition: opacity 150ms ease;
}

.window-manager__traffic-lights:hover .window-manager__traffic-control span,
.window-manager__traffic-control:focus-visible span {
  opacity: .72;
}

button.window-manager__traffic-control {
  cursor: pointer;
}

.window-manager__traffic-control--close::before { background: #ef6b62; }
.window-manager__traffic-control--zoom::before { background: #57ba78; }

.window-manager__preview a {
  color: #1e4dc0;
  font: inherit;
}

.window-manager__preview {
  min-height: 0;
  margin: 12px 28px 28px;
  padding: 24px 28px;
  border: 1px dashed rgb(64 125 180 / 35%);
  border-radius: 10px;
  background: rgb(255 255 255 / 35%);
  overflow: auto;
  color: #485465;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  line-height: 1.75;
}

.window-manager__preview p {
  margin: 0 0 16px;
}

.window-manager__status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.window-manager__status span {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  padding: 4px 11px;
  border: 1px solid rgb(183 121 0 / 22%);
  border-radius: 999px;
  background: #fff0b8;
  color: #795800;
  font-size: 12px;
  font-weight: 700;
}

.window-manager__status p {
  margin: 0;
  color: #69707d;
  font-size: 13px;
}

.window-manager__tape {
  position: absolute;
  z-index: 2;
  top: -7px;
  right: 92px;
  width: 72px;
  height: 21px;
  transform: rotate(2deg);
  background: rgb(244 215 88 / 76%);
  box-shadow: 0 2px 4px rgb(65 73 82 / 10%);
  pointer-events: none;
}

.window-manager__sparkle {
  position: absolute;
  right: 24px;
  bottom: 18px;
  color: rgb(47 131 214 / 34%);
  font-size: 17px;
  pointer-events: none;
}

.window-manager__resize-handle {
  position: absolute;
  z-index: 4;
  touch-action: none;
  user-select: none;
}

.window-manager__resize-handle--n,
.window-manager__resize-handle--s {
  right: 18px;
  left: 18px;
  height: 10px;
}

.window-manager__resize-handle--n { top: -2px; cursor: n-resize; }
.window-manager__resize-handle--s { bottom: -2px; cursor: s-resize; }

.window-manager__resize-handle--e,
.window-manager__resize-handle--w {
  top: 18px;
  bottom: 18px;
  width: 10px;
}

.window-manager__resize-handle--e { right: -2px; cursor: e-resize; }
.window-manager__resize-handle--w { left: -2px; cursor: w-resize; }

.window-manager__resize-handle--nw,
.window-manager__resize-handle--ne,
.window-manager__resize-handle--se,
.window-manager__resize-handle--sw {
  width: 22px;
  height: 22px;
}

.window-manager__resize-handle--nw { top: -2px; left: -2px; cursor: nw-resize; }
.window-manager__resize-handle--ne { top: -2px; right: -2px; cursor: ne-resize; }
.window-manager__resize-handle--se { right: -2px; bottom: -2px; cursor: se-resize; }
.window-manager__resize-handle--sw { bottom: -2px; left: -2px; cursor: sw-resize; }

.window-manager__resize-handle--se::after {
  position: absolute;
  right: 7px;
  bottom: 6px;
  width: 9px;
  height: 9px;
  border-right: 2px solid rgb(45 111 181 / 38%);
  border-bottom: 2px solid rgb(45 111 181 / 38%);
  border-radius: 0 0 5px;
  content: "";
}

.window-manager.is-manipulating {
  user-select: none;
}

.window-manager.is-manipulating .window-manager__preview {
  pointer-events: none;
  user-select: none;
}

.window-manager :where(a, button):focus-visible {
  outline: 3px solid #315efb;
  outline-offset: 2px;
}

.window-manager__resize-handle:focus-visible {
  outline: 3px solid #315efb;
  outline-offset: -3px;
}

@media (max-width: 767px) {
  .window-manager__window {
    grid-template-rows: 46px 1fr;
    left: 16px !important;
    width: calc(100vw - 32px) !important;
    min-width: 0;
    max-width: calc(100vw - 32px);
    max-height: calc(100dvh - 46px);
    border-radius: 18px;
  }

  .window-manager__window.is-maximized {
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: 100% !important;
    max-width: none;
    max-height: none;
    border-radius: 0;
  }

  .window-manager__traffic-control {
    width: 44px;
    height: 44px;
  }

  .window-manager__preview {
    margin: 10px 20px 22px;
    padding: 20px;
  }

  .window-manager__resize-handle {
    display: none;
  }

  .window-manager__tape {
    right: 82px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .window-manager__window {
    scroll-behavior: auto;
  }
}
</style>
