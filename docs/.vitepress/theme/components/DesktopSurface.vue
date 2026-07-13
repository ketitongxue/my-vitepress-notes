<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import DesktopIcon from './DesktopIcon.vue'
import WindowManager from './WindowManager.vue'
import { constrainIconPosition } from './desktopGeometry.mjs'
import { desktopEntries } from './personalOsContent.mjs'
import {
  createWindowState,
  moveWindow,
  openWindow,
} from './windowManagerState.mjs'

const MENU_HEIGHT = 30
const surface = ref(null)
const iconPositions = ref(createIconPositions())
const windowState = ref(createWindowState())
const bounds = ref({ width: 1280, height: 690 })
const clock = ref('00:00')
let resizeObserver
let clockTimer

function createIconPositions() {
  return Object.fromEntries(desktopEntries.map((entry) => [entry.id, {
    anchor: 'right',
    ...entry.position,
  }]))
}

function iconStyle(position) {
  if (position.anchor === 'right') return { right: `${position.x}px`, top: `${position.y}px` }
  return { left: `${position.x}px`, top: `${position.y}px` }
}

function resetIconPositions() {
  iconPositions.value = createIconPositions()
  constrainIconPositions(bounds.value)
}

function updateIconPosition({ id, position }) {
  iconPositions.value = {
    ...iconPositions.value,
    [id]: constrainIconPosition(position, bounds.value),
  }
}

function constrainIconPositions(nextBounds) {
  iconPositions.value = Object.fromEntries(Object.entries(iconPositions.value).map(([id, position]) => [
    id,
    constrainIconPosition(position, nextBounds),
  ]))
}

function openEntry(entry) {
  windowState.value = openWindow(windowState.value, entry, bounds.value)
}

function constrainOpenWindows(nextBounds) {
  let nextState = windowState.value
  for (const item of nextState.windows) {
    nextState = moveWindow(nextState, item.id, { x: item.x, y: item.y }, nextBounds)
  }
  windowState.value = nextState
}

function measureSurface() {
  if (!surface.value) return
  const nextBounds = {
    width: surface.value.clientWidth,
    height: Math.max(0, surface.value.clientHeight - MENU_HEIGHT),
  }
  bounds.value = nextBounds
  constrainIconPositions(nextBounds)
  constrainOpenWindows(nextBounds)
}

function updateClock() {
  const now = new Date()
  clock.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  measureSurface()
  updateClock()
  clockTimer = window.setInterval(updateClock, 1000)
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(measureSurface)
    resizeObserver.observe(surface.value)
  }
  window.addEventListener('resize', measureSurface)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.clearInterval(clockTimer)
  window.removeEventListener('resize', measureSurface)
})
</script>

<template>
  <section ref="surface" class="desktop-surface" aria-label="JuZX OS 桌面">
    <header class="desktop-surface__menu">
      <strong>JuZX OS</strong>
      <span>桌面</span>
      <button type="button" @click="resetIconPositions">重置桌面位置</button>
      <time :datetime="clock">{{ clock }}</time>
    </header>

    <div class="desktop-surface__workspace">
      <DesktopIcon
        v-for="entry in desktopEntries"
        :key="entry.id"
        :entry="entry"
        :position="iconPositions[entry.id]"
        :bounds="bounds"
        :style="iconStyle(iconPositions[entry.id])"
        @move="updateIconPosition"
        @open="openEntry"
      />
      <WindowManager v-model:state="windowState" :bounds="bounds" />
    </div>
  </section>
</template>

<style scoped>
.desktop-surface {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background: #2B7FD8;
  color: #f6f7fb;
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
}

.desktop-surface__menu {
  position: relative;
  z-index: 20;
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  gap: 18px;
  background: rgb(9 17 30 / 88%);
  border-bottom: 1px solid rgb(255 255 255 / 18%);
  font-size: 12px;
}

.desktop-surface__menu button {
  justify-self: start;
  min-height: 24px;
  padding: 2px 8px;
  border: 1px solid rgb(255 255 255 / 38%);
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.desktop-surface__menu button:focus-visible {
  outline: 2px solid #f2c94c;
  outline-offset: 1px;
}

.desktop-surface__workspace {
  position: absolute;
  inset: 30px 0 0;
  overflow: hidden;
}
</style>
