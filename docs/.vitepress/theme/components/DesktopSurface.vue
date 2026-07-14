<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import DesktopIcon from './DesktopIcon.vue'
import WindowManager from './WindowManager.vue'
import { constrainIconPosition, resolveSurfaceBounds } from './desktopGeometry.mjs'
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
  const nextBounds = resolveSurfaceBounds(
    bounds.value,
    surface.value.clientWidth,
    surface.value.clientHeight,
    MENU_HEIGHT,
  )
  if (nextBounds === bounds.value) return
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
      <a class="desktop-surface__brand" href="#home">JuZX OS</a>
      <nav aria-label="JuZX OS 菜单">
        <a href="/about">About</a>
        <a href="#knowledge">Knowledge</a>
        <a href="#system">Now</a>
      </nav>
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
  min-height: 100vh;
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
  background: rgb(43 127 216 / 96%);
  border-bottom: 1px solid rgb(255 255 255 / 22%);
  font-size: 11px;
}

.desktop-surface__menu nav {
  display: flex;
  gap: 14px;
}

.desktop-surface__menu a {
  color: inherit;
  text-decoration: none;
}

.desktop-surface__menu a:focus-visible {
  outline: 3px solid #f4d758;
  outline-offset: 2px;
}

.desktop-surface__menu .desktop-surface__brand {
  color: #F4D758;
  font-weight: 700;
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
  outline: 3px solid #f4d758;
  outline-offset: 1px;
}

.desktop-surface__workspace {
  position: absolute;
  inset: 30px 0 0;
  height: calc(100vh - 30px);
  height: calc(100dvh - 30px);
  overflow: hidden;
}

@media (max-width: 767px) {
  .desktop-surface__menu {
    grid-template-columns: auto 1fr auto;
    gap: 8px;
    padding: 0 8px;
  }

  .desktop-surface__menu nav {
    display: none;
  }

  .desktop-surface__menu button {
    min-width: 44px;
    min-height: 44px;
    justify-self: end;
    overflow: hidden;
    max-width: 44px;
    color: transparent;
    white-space: nowrap;
  }

  .desktop-surface__menu button::after {
    content: "Reset";
    color: #fffdf7;
  }

  .desktop-surface__menu time {
    min-width: 42px;
    text-align: right;
  }
}

@media (prefers-reduced-motion: reduce) {
  .desktop-surface :where(a, button) {
    transition: none !important;
  }
}
</style>
