<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { bootLines } from './personalOsContent.mjs'
import {
  computeCoverTransform,
  getReducedMotionPreference,
  getSessionStorage,
  progressCells,
  transitionMacbookBoot,
  writeAccessed,
} from './macbookBootState.mjs'

const emit = defineEmits(['entered'])
const screen = ref(null)
const launchButton = ref(null)
const visible = ref(true)
const state = ref('typing')
const visibleLineCount = ref(0)
const progress = ref(0)
const timers = new Set()
const interactiveSelector = 'a, button, input, select, textarea, [contenteditable="true"], [role="button"]'
let storage

const visibleLines = computed(() => bootLines.slice(0, visibleLineCount.value))
const liveMessage = computed(() => {
  if (state.value === 'launching') return `正在启动 ${progress.value} / 12`
  if (state.value === 'ready') return '系统已就绪，按 Enter 启动'
  if (state.value === 'zooming') return '正在进入桌面'
  return visibleLines.value.at(-1) ?? '正在准备个人系统'
})

function schedule(callback, delay) {
  const timer = window.setTimeout(() => {
    timers.delete(timer)
    callback()
  }, delay)
  timers.add(timer)
  return timer
}

function clearPreflightFallback() {
  const timer = window['__personalSiteAccessFallback']
  if (timer !== undefined) window.clearTimeout(timer)
  delete window['__personalSiteAccessFallback']
}

function wasAccessed(candidate) {
  try { return candidate?.getItem('personal-site-accessed') === 'true' }
  catch { return true }
}

async function enterDesktop() {
  state.value = 'desktop'
  writeAccessed(storage)
  visible.value = false
  document.documentElement.dataset.personalSiteAccess = 'entered'
  emit('entered')
  await nextTick()
  document.getElementById('factory-title')?.focus({ preventScroll: true })
}

function beginZoom() {
  if (state.value !== 'launching' || !screen.value) return
  state.value = transitionMacbookBoot(state.value, 'PROGRESS_COMPLETE')
  const bounds = screen.value.getBoundingClientRect()
  const transform = computeCoverTransform(bounds, {
    width: window.innerWidth,
    height: window.innerHeight,
  })
  screen.value.style.setProperty('--boot-scale', String(transform.scale))
  screen.value.style.setProperty('--boot-x', `${transform.translateX}px`)
  screen.value.style.setProperty('--boot-y', `${transform.translateY}px`)
  schedule(() => {
    state.value = transitionMacbookBoot(state.value, 'ZOOM_COMPLETE')
    void enterDesktop()
  }, 500)
}

function advanceProgress() {
  if (state.value !== 'launching') return
  progress.value += 1
  if (progress.value < 12) schedule(advanceProgress, 55)
  else beginZoom()
}

function activate() {
  if (state.value !== 'ready') return
  state.value = transitionMacbookBoot(state.value, 'ACTIVATE')
  progress.value = 0
  schedule(advanceProgress, 55)
}

function handleKeydown(event) {
  if (event.key !== 'Enter' || event.repeat || event.isComposing || state.value !== 'ready') return
  if (typeof event.target?.closest === 'function' && event.target?.closest(interactiveSelector)) return
  event.preventDefault()
  activate()
}

function revealNextLine() {
  if (state.value !== 'typing') return
  visibleLineCount.value += 1
  if (visibleLineCount.value < bootLines.length) {
    schedule(revealNextLine, 220)
    return
  }
  state.value = transitionMacbookBoot(state.value, 'TYPING_COMPLETE')
  void nextTick(() => launchButton.value?.focus({ preventScroll: true }))
}

onMounted(() => {
  storage = getSessionStorage(window)
  const reduceMotion = getReducedMotionPreference(window)
  const returning = wasAccessed(storage)
  clearPreflightFallback()
  window.addEventListener('keydown', handleKeydown)

  if (returning || reduceMotion) {
    state.value = transitionMacbookBoot(state.value, 'SKIP')
    document.documentElement.dataset.personalSiteAccess = 'returning'
    schedule(() => void enterDesktop(), 80)
    return
  }

  visibleLineCount.value = 1
  if (bootLines.length === 1) state.value = transitionMacbookBoot(state.value, 'TYPING_COMPLETE')
  else schedule(revealNextLine, 220)
})

onBeforeUnmount(() => {
  for (const timer of timers) window.clearTimeout(timer)
  timers.clear()
  window.removeEventListener('keydown', handleKeydown)
  clearPreflightFallback()
  if (document.documentElement.dataset.personalSiteAccess === 'pending') {
    document.documentElement.dataset.personalSiteAccess = 'fallback'
  }
})
</script>

<template>
  <section v-if="visible" class="macbook-boot" :data-state="state" aria-label="个人系统启动页">
    <div class="macbook-boot__computer">
      <div ref="screen" class="macbook-boot__screen">
        <div class="macbook-boot__terminal" aria-hidden="true">
          <p v-for="(line, index) in visibleLines" :key="`${index}-${line}`">{{ line }}</p>
          <p v-if="state === 'launching' || state === 'zooming'" class="macbook-boot__progress">
            {{ progressCells(progress) }}
          </p>
        </div>
        <p class="macbook-boot__status" aria-live="polite">{{ liveMessage }}</p>
        <button
          v-if="state === 'ready'"
          ref="launchButton"
          type="button"
          class="macbook-boot__launch"
          @click="activate"
        >
          启动 JuZX OS
        </button>
      </div>
      <div class="macbook-boot__base" aria-hidden="true"></div>
    </div>
  </section>
</template>

<style scoped>
.macbook-boot {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  min-height: 100dvh;
  place-items: center;
  overflow: hidden;
  background: #f7f4ec;
  color: #1e2430;
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
}

.macbook-boot__computer {
  width: min(760px, calc(100vw - 32px));
}

.macbook-boot__screen {
  --boot-scale: 1;
  --boot-x: 0px;
  --boot-y: 0px;
  position: relative;
  min-height: min(430px, 64vh);
  padding: clamp(24px, 5vw, 56px);
  overflow: hidden;
  border: 12px solid #192232;
  border-radius: 24px 24px 10px 10px;
  background: #fffdf7;
  transform-origin: center;
}

.macbook-boot[data-state="zooming"] .macbook-boot__screen {
  transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
  transform: translate(var(--boot-x), var(--boot-y)) scale(var(--boot-scale));
}

.macbook-boot__terminal p {
  margin: 0 0 12px;
  overflow-wrap: anywhere;
}

.macbook-boot__progress {
  color: #315efb;
}

.macbook-boot__status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.macbook-boot__launch {
  min-width: 44px;
  min-height: 44px;
  margin-top: 20px;
  padding: 10px 16px;
  border: 2px solid #1e2430;
  border-radius: 8px;
  background: #f2c94c;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.macbook-boot__launch:focus-visible {
  outline: 2px solid #315efb;
  outline-offset: 3px;
}

.macbook-boot__base {
  width: calc(100% + 44px);
  height: 22px;
  margin-left: -22px;
  border-radius: 2px 2px 18px 18px;
  background: #69707d;
}

@media (prefers-reduced-motion: reduce) {
  .macbook-boot__screen {
    transition-duration: 0.01ms !important;
  }
}
</style>
