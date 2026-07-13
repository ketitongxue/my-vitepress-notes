<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  closeWindow,
  focusWindow,
  moveWindow,
  resizeWindow,
  resizeWindowByKey,
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
const externalLabel = (title) => `在新页面打开 ${title}`

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

function handleResizeKey(item, event) {
  const nextState = resizeWindowByKey(
    props.state,
    item.id,
    event.key,
    event.shiftKey,
    props.bounds,
  )
  if (nextState === props.state) return
  event.preventDefault()
  updateState(nextState)
}

function beginManipulation(kind, item, event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const target = event.currentTarget
  target.setPointerCapture(event.pointerId)
  manipulation.value = {
    kind,
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

  updateState(resizeWindow(
    props.state,
    active.id,
    { width: active.initial.width + dx, height: active.initial.height + dy },
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
        <strong>{{ titleFor(item) }}</strong>
        <span class="window-manager__controls">
          <a
            v-if="item.entry.window.href"
            :href="item.entry.window.href"
            :aria-label="externalLabel(titleFor(item))"
            target="_blank"
            rel="noopener noreferrer"
            @pointerdown.stop="focus(item.id)"
          >打开</a>
          <button
            type="button"
            :aria-label="closeLabel(titleFor(item))"
            @pointerdown.stop="focus(item.id)"
            @click="close(item.id)"
          >关闭</button>
        </span>
      </header>

      <div class="window-manager__preview">
        <p>{{ item.entry.window.summary }}</p>
        <a
          v-if="item.entry.window.href"
          :href="item.entry.window.href"
          :target="item.entry.window.external ? '_blank' : undefined"
          :rel="item.entry.window.external ? 'noopener noreferrer' : undefined"
        >前往 {{ titleFor(item) }}</a>
        <p v-else>此项目正在整理中。</p>
      </div>

      <button
        type="button"
        class="window-manager__resize"
        :aria-label="`调整 ${titleFor(item)} 窗口大小，使用方向键`"
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
        @pointerdown="beginManipulation('resize', item, $event)"
        @pointermove="queueManipulation"
        @pointerup="endManipulation"
        @pointercancel="cancelManipulation"
        @keydown="handleResizeKey(item, $event)"
      >调整大小</button>
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
  display: grid;
  grid-template-rows: 38px 1fr;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 32%);
  border-radius: 10px;
  background: #f9fafb;
  color: #1e2430;
  box-shadow: 0 20px 55px rgb(7 15 31 / 38%);
  pointer-events: auto;
}

.window-manager__titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 8px 0 12px;
  background: #e9edf4;
  touch-action: none;
  user-select: none;
  cursor: move;
}

.window-manager__titlebar strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-manager__controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.window-manager__controls a,
.window-manager__controls button,
.window-manager__preview a {
  color: #1e4dc0;
  font: inherit;
}

.window-manager__controls a,
.window-manager__controls button {
  min-height: 28px;
  padding: 4px 8px;
  border: 1px solid #aeb8c8;
  border-radius: 5px;
  background: #fff;
  font-size: 12px;
  line-height: 18px;
  text-decoration: none;
  cursor: pointer;
}

.window-manager__preview {
  min-height: 0;
  padding: 24px;
  overflow: auto;
}

.window-manager__preview p {
  margin: 0 0 16px;
}

.window-manager__resize {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 72px;
  min-height: 28px;
  padding: 4px;
  border: 1px solid #aeb8c8;
  border-radius: 5px;
  background: #fff;
  color: #394459;
  font: inherit;
  font-size: 11px;
  touch-action: none;
  cursor: nwse-resize;
}

.window-manager.is-manipulating .window-manager__preview {
  pointer-events: none;
  user-select: none;
}

@media (prefers-reduced-motion: reduce) {
  .window-manager__window {
    scroll-behavior: auto;
  }
}
</style>
