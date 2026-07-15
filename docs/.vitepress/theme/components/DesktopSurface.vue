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

const surface = ref(null)
const menu = ref(null)
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
    menu.value?.offsetHeight ?? 40,
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
    <header ref="menu" class="desktop-surface__menu">
      <a class="desktop-surface__brand is-active" href="#home" aria-current="page">JuZX OS</a>
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
  background:
    radial-gradient(circle at 28% 18%, rgb(86 170 239 / 58%) 0, transparent 28%),
    radial-gradient(circle at 82% 72%, rgb(39 112 192 / 38%) 0, transparent 34%),
    linear-gradient(145deg, #3b91e1 0%, #2f83d6 46%, #2875c5 100%);
  color: #f6f7fb;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.desktop-surface::before,
.desktop-surface::after {
  position: absolute;
  z-index: 0;
  content: "";
  pointer-events: none;
}

.desktop-surface::before {
  inset: 0;
  opacity: .42;
  background-image:
    radial-gradient(circle, rgb(255 245 180 / 82%) 0 1px, transparent 1.7px),
    radial-gradient(circle, rgb(255 255 255 / 64%) 0 1.2px, transparent 2px),
    radial-gradient(circle, rgb(207 232 255 / 48%) 0 1px, transparent 1.6px);
  background-position: 10px 18px, 43px 64px, 72px 22px;
  background-size: 92px 92px, 128px 128px, 156px 156px;
}

.desktop-surface::after {
  top: 12%;
  left: 8%;
  width: 5px;
  height: 5px;
  border-radius: 1px;
  background: rgb(255 244 170 / 76%);
  box-shadow:
    16vw 19vh rgb(225 241 255 / 52%),
    31vw -3vh rgb(255 244 170 / 64%),
    47vw 31vh rgb(225 241 255 / 46%),
    63vw 8vh rgb(255 244 170 / 68%),
    77vw 42vh rgb(225 241 255 / 52%),
    24vw 62vh rgb(255 244 170 / 62%),
    56vw 70vh rgb(225 241 255 / 48%),
    84vw 68vh rgb(255 244 170 / 62%);
  transform: rotate(45deg);
}

.desktop-surface__menu {
  position: relative;
  z-index: 20;
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  height: 40px;
  padding: 0 18px;
  gap: 20px;
  background: rgb(47 131 214 / 88%);
  border-bottom: 1px solid rgb(255 255 255 / 8%);
  font-size: 11px;
}

.desktop-surface__menu nav {
  display: flex;
  gap: 16px;
}

.desktop-surface__menu a {
  position: relative;
  color: inherit;
  text-decoration: none;
  transition: color 180ms ease, opacity 180ms ease;
}

.desktop-surface__menu nav a {
  color: rgb(244 248 252 / 78%);
}

.desktop-surface__menu nav a::after {
  position: absolute;
  right: 20%;
  bottom: -5px;
  left: 20%;
  height: 2px;
  border-radius: 999px;
  background: #f7dd76;
  content: "";
  opacity: 0;
  transform: scaleX(.5);
  transition: opacity 180ms ease, transform 180ms ease;
}

.desktop-surface__menu nav a:hover,
.desktop-surface__menu nav a:focus-visible {
  color: #fffdf6;
}

.desktop-surface__menu nav a:hover::after,
.desktop-surface__menu nav a:focus-visible::after {
  opacity: .85;
  transform: scaleX(1);
}

.desktop-surface__menu a:focus-visible {
  outline: 3px solid #f4d758;
  outline-offset: 2px;
}

.desktop-surface__menu .desktop-surface__brand {
  color: #F4D758;
  font-family: "Comic Sans MS", "Bradley Hand", "Segoe Print", cursive;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .02em;
}

.desktop-surface__menu button {
  justify-self: start;
  min-height: 28px;
  padding: 3px 10px;
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 999px;
  background: rgb(255 255 255 / 8%);
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
  z-index: 1;
  inset: 40px 0 0;
  height: calc(100vh - 40px);
  height: calc(100dvh - 40px);
  overflow: hidden;
}

.desktop-surface__menu time {
  color: rgb(237 245 252 / 58%);
  font: 10px/1 "JetBrains Mono", "Fira Code", Consolas, monospace;
}

@media (max-width: 767px) {
  .desktop-surface__menu {
    grid-template-columns: auto minmax(0, 1fr) auto;
    height: 48px;
    gap: 10px;
    padding: 0 12px;
  }

  .desktop-surface__menu nav {
    justify-content: center;
    gap: clamp(7px, 3vw, 14px);
  }

  .desktop-surface__menu button {
    display: none;
  }

  .desktop-surface__menu time {
    min-width: 42px;
    text-align: right;
  }

  .desktop-surface__workspace {
    inset: 48px 0 0;
    height: calc(100vh - 48px);
    height: calc(100dvh - 48px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .desktop-surface :where(a, button) {
    transition: none !important;
  }
}
</style>
