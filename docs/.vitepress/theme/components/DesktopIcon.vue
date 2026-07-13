<script setup>
import { computed } from 'vue'
import { IconFileText, IconFolder, IconTerminal2, IconWorld } from '@tabler/icons-vue'
import {
  consumeIconDoubleClick,
  createIconActivationState,
  finishIconPointer,
  isDragDistance,
  resolveIconPosition,
} from './desktopGeometry.mjs'

const props = defineProps({
  entry: { type: Object, required: true },
  position: { type: Object, required: true },
  bounds: { type: Object, required: true },
})

const emit = defineEmits(['move', 'open'])

const iconComponents = Object.freeze({
  folder: IconFolder,
  file: IconFileText,
  terminal: IconTerminal2,
  world: IconWorld,
})
const iconComponent = computed(() => iconComponents[props.entry.icon] ?? IconFileText)

let gesture = null
let activationState = createIconActivationState()

function pointFrom(event) {
  return { x: event.clientX, y: event.clientY }
}

function handlePointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const start = pointFrom(event)
  gesture = {
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    start,
    current: start,
    origin: resolveIconPosition(props.position, props.bounds),
    dragged: false,
  }
  event.currentTarget.setPointerCapture(event.pointerId)
}

function handlePointerMove(event) {
  if (!gesture || event.pointerId !== gesture.pointerId) return
  gesture.current = pointFrom(event)
  if (!isDragDistance(gesture.start, gesture.current)) return
  moveGesture()
}

function moveGesture() {
  gesture.dragged = true
  emit('move', {
    id: props.entry.id,
    position: {
      anchor: 'left',
      x: gesture.origin.x + (gesture.current.x - gesture.start.x),
      y: gesture.origin.y + (gesture.current.y - gesture.start.y),
    },
  })
}

function releaseCapture(target, pointerId) {
  if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId)
}

function handlePointerUp(event) {
  if (!gesture || event.pointerId !== gesture.pointerId) return
  gesture.current = pointFrom(event)
  const dragged = gesture.dragged || isDragDistance(gesture.start, gesture.current)
  const activation = finishIconPointer(activationState, {
    dragged,
    pointerType: gesture.pointerType,
    timeStamp: event.timeStamp,
  })
  activationState = activation.state
  if (dragged && !gesture.dragged) moveGesture()
  releaseCapture(event.currentTarget, gesture.pointerId)
  gesture = null
  if (activation.openTouch) open()
}

function handlePointerCancel(event) {
  if (!gesture || event.pointerId !== gesture.pointerId) return
  releaseCapture(event.currentTarget, gesture.pointerId)
  gesture = null
}

function open() {
  emit('open', props.entry)
}

function handleDoubleClick(event) {
  const activation = consumeIconDoubleClick(activationState, event.timeStamp)
  activationState = activation.state
  if (activation.open) open()
}

function handleKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  open()
}
</script>

<template>
  <button
    type="button"
    class="desktop-icon"
    @dblclick="handleDoubleClick"
    @keydown="handleKeydown"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
    @dragstart.prevent
  >
    <component :is="iconComponent" aria-hidden="true" />
    <span>{{ entry.label }}</span>
  </button>
</template>

<style scoped>
.desktop-icon {
  position: absolute;
  z-index: 2;
  display: grid;
  width: 88px;
  min-height: 76px;
  padding: 8px 4px;
  place-items: center;
  gap: 4px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #f6f7fb;
  font: inherit;
  text-align: center;
  touch-action: none;
  user-select: none;
  cursor: default;
}

.desktop-icon:hover,
.desktop-icon:focus-visible {
  border-color: rgb(255 255 255 / 45%);
  background: rgb(255 255 255 / 12%);
}

.desktop-icon:focus-visible {
  outline: 2px solid #f2c94c;
  outline-offset: 2px;
}

.desktop-icon :deep(svg) {
  width: 34px;
  height: 34px;
  stroke-width: 1.6;
}

.desktop-icon span {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 1.2;
  text-shadow: 0 1px 3px rgb(0 0 0 / 80%);
}
</style>
