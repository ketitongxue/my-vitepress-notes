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
    :data-icon-kind="entry.icon"
    @dblclick="handleDoubleClick"
    @keydown="handleKeydown"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
    @dragstart.prevent
  >
    <span class="desktop-icon__tile" aria-hidden="true">
      <component :is="iconComponent" />
    </span>
    <span class="desktop-icon__label">{{ entry.label }}</span>
  </button>
</template>

<style scoped>
.desktop-icon {
  position: absolute;
  z-index: 2;
  display: grid;
  width: 88px;
  min-height: 92px;
  padding: 8px 4px 6px;
  place-items: center;
  gap: 4px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: transparent;
  color: #f6f7fb;
  font: inherit;
  text-align: center;
  touch-action: none;
  user-select: none;
  cursor: default;
  transition: transform 180ms cubic-bezier(.16, 1, .3, 1), background-color 180ms ease,
    border-color 180ms ease;
}

.desktop-icon:hover,
.desktop-icon:focus-visible {
  border-color: rgb(255 255 255 / 38%);
  background: rgb(255 255 255 / 9%);
  transform: translateY(-3px) scale(1.02);
}

.desktop-icon:active {
  transform: translateY(-1px) scale(.98);
}

.desktop-icon:focus-visible {
  outline: 3px solid #f4d758;
  outline-offset: 2px;
}

.desktop-icon__tile {
  position: relative;
  display: grid;
  width: 56px;
  height: 52px;
  place-items: center;
  overflow: visible;
  border: 1px solid rgb(255 255 255 / 62%);
  border-radius: 15px;
  background: linear-gradient(145deg, #fffdf6, #e8f1fb);
  color: #2d6fb5;
  box-shadow: 0 7px 15px rgb(20 65 110 / 22%), inset 0 1px rgb(255 255 255 / 72%);
  transition: box-shadow 180ms ease;
}

.desktop-icon:hover .desktop-icon__tile,
.desktop-icon:focus-visible .desktop-icon__tile {
  box-shadow: 0 10px 19px rgb(20 65 110 / 28%), inset 0 1px rgb(255 255 255 / 82%);
}

.desktop-icon[data-icon-kind="folder"] .desktop-icon__tile {
  border-color: rgb(255 240 177 / 72%);
  background: linear-gradient(155deg, #ffe88d, #f2c94c);
  color: #8b6500;
}

.desktop-icon[data-icon-kind="folder"] .desktop-icon__tile::before {
  position: absolute;
  top: -7px;
  left: 8px;
  width: 24px;
  height: 10px;
  border: 1px solid rgb(255 240 177 / 72%);
  border-bottom: 0;
  border-radius: 7px 7px 0 0;
  background: #f8da68;
  content: "";
}

.desktop-icon[data-icon-kind="terminal"] .desktop-icon__tile {
  border-color: rgb(255 255 255 / 34%);
  background: linear-gradient(155deg, #263858, #192232);
  color: #f3f7fd;
}

.desktop-icon[data-icon-kind="file"] .desktop-icon__tile::after {
  position: absolute;
  right: 6px;
  bottom: 5px;
  padding: 1px 4px;
  border-radius: 4px;
  background: #2f83d6;
  color: #fff;
  content: "DOC";
  font: 700 7px/1.4 "JetBrains Mono", "Fira Code", Consolas, monospace;
}

.desktop-icon :deep(svg) {
  width: 32px;
  height: 32px;
  stroke-width: 1.8;
}

.desktop-icon__label {
  max-width: 100%;
  overflow-wrap: anywhere;
  color: #fffdf6;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.25;
  text-shadow: 0 1px 2px rgb(25 34 50 / 72%);
}

@media (max-width: 767px) {
  .desktop-icon {
    width: 68px;
    min-height: 86px;
    padding: 6px 2px;
  }

  .desktop-icon__tile {
    width: 52px;
    height: 48px;
  }

  .desktop-icon :deep(svg) {
    width: 30px;
    height: 30px;
  }

  .desktop-icon__label {
    font-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .desktop-icon {
    transition: none !important;
  }
}
</style>
