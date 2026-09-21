<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  computeCoverTransform,
  createMacbookBootRuntime,
  MACBOOK_BOOT_TIMING,
  getReducedMotionPreference,
  getLocalStorage,
  progressCells,
  shouldSkipMacbookFromEnter,
  shouldSkipMacbookBoot,
  startMacbookBootSequence,
  transitionMacbookBoot,
  writeAccessed,
} from './macbookBootState.mjs'

const props = defineProps({
  active: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  configuration: { type: Object, required: true },
})
const emit = defineEmits(['entered'])
const screen = ref(null)
const visible = ref(true)
const state = ref('typing')
const progress = ref(0)
const zoomDuration = MACBOOK_BOOT_TIMING.zoomDuration
let storage
let runtime
let motionPreference
let entered = false
let started = false

const visibleLines = computed(() => props.configuration.boot.lines)
const liveMessage = computed(() => {
  if (state.value === 'launching') return `正在启动 ${progress.value} / 12`
  if (state.value === 'ready') return '系统已就绪，即将进入桌面'
  if (state.value === 'zooming') return '正在进入桌面'
  return visibleLines.value.at(-1) ?? '正在准备个人系统'
})

function clearPreflightFallback() {
  const timer = window['__personalSiteAccessFallback']
  if (timer !== undefined) window.clearTimeout(timer)
  delete window['__personalSiteAccessFallback']
}

async function enterDesktop() {
  if (entered) return
  entered = true
  runtime?.stop()
  state.value = 'desktop'
  writeAccessed(storage)
  visible.value = false
  document.documentElement.dataset.personalSiteAccess = 'entered'
  emit('entered')
  await nextTick()
  document.getElementById('factory-title')?.focus({ preventScroll: true })
}

function terminateBoot() {
  runtime?.stop()
  state.value = 'desktop'
  visible.value = false
  if (!entered) {
    entered = true
    emit('entered')
  }
}

function beginZoom() {
  if (state.value !== 'launching' || !screen.value) return
  state.value = transitionMacbookBoot(state.value, 'PROGRESS_COMPLETE')
  const bounds = screen.value.getBoundingClientRect()
  const viewport = window.visualViewport
  // Cover with the display itself so the bezel never remains at the viewport edge.
  const border = Number.parseFloat(getComputedStyle(screen.value).borderLeftWidth) || 0
  const transform = computeCoverTransform({
    left: bounds.left - (viewport?.offsetLeft ?? 0) + border,
    top: bounds.top - (viewport?.offsetTop ?? 0) + border,
    width: bounds.width - border * 2,
    height: bounds.height - border * 2,
  }, {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  })
  screen.value.style.setProperty('--boot-scale', String(transform.scale))
  screen.value.style.setProperty('--boot-x', `${transform.translateX}px`)
  screen.value.style.setProperty('--boot-y', `${transform.translateY}px`)
}

function handleMotionChange(event) {
  if (event.matches && !entered) void enterDesktop()
}

function activate() {
  if (state.value !== 'ready') return
  state.value = transitionMacbookBoot(state.value, 'ACTIVATE')
  progress.value = 0
  startMacbookBootSequence(runtime, {
    onProgress: (count) => { progress.value = count },
    onZoom: beginZoom,
    onComplete: () => {
      state.value = transitionMacbookBoot(state.value, 'ZOOM_COMPLETE')
      void enterDesktop()
    },
  })
}

function handleKeydown(event) {
  if (!shouldSkipMacbookFromEnter(event, state.value)) return
  event.preventDefault()
  void enterDesktop()
}

function startBoot() {
  if (started || !props.active) return
  started = true
  const disabled = props.disabled || document.documentElement.dataset.personalSiteAccess === 'fallback'
  runtime = createMacbookBootRuntime(window, handleKeydown, disabled)
  clearPreflightFallback()
  if (disabled) {
    terminateBoot()
    return
  }

  storage = getLocalStorage(window)
  const reduceMotion = getReducedMotionPreference(window)
  motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  motionPreference?.addEventListener('change', handleMotionChange)
  const skipBoot = shouldSkipMacbookBoot(storage, reduceMotion)
  runtime.listen()

  if (skipBoot) {
    state.value = transitionMacbookBoot(state.value, 'SKIP')
    document.documentElement.dataset.personalSiteAccess = 'returning'
    void enterDesktop()
    return
  }

  state.value = transitionMacbookBoot(state.value, 'TYPING_COMPLETE')
  activate()
}

onMounted(startBoot)

watch(() => props.active, (active) => {
  if (active) startBoot()
})

watch(() => props.disabled, (disabled) => {
  if (!disabled || !props.active) return
  if (!started) startBoot()
  else terminateBoot()
})

onBeforeUnmount(() => {
  runtime?.stop()
  motionPreference?.removeEventListener('change', handleMotionChange)
  clearPreflightFallback()
  if (document.documentElement.dataset.personalSiteAccess === 'pending') {
    document.documentElement.dataset.personalSiteAccess = 'fallback'
  }
})
</script>

<template>
  <section v-if="visible" class="macbook-boot" :data-state="state" :style="{ '--boot-zoom-duration': `${zoomDuration}ms` }" aria-label="个人系统启动页">
    <div class="macbook-boot__computer">
      <div ref="screen" class="macbook-boot__screen">
        <div class="macbook-boot__terminal" aria-hidden="true">
          <div class="macbook-boot__terminal-bar">{{ configuration.desktop.brand }} ~ zsh</div>
          <p v-for="(line, index) in visibleLines" :key="`${index}-${line}`">{{ line }}</p>
          <p v-if="state === 'launching' || state === 'zooming'" class="macbook-boot__progress">
            {{ progressCells(progress) }}
          </p>
        </div>
        <p class="macbook-boot__status" aria-live="polite">{{ liveMessage }}</p>
        <button
          type="button"
          class="macbook-boot__launch"
          @click="enterDesktop"
        >
          {{ configuration.boot.launchLabel }}
        </button>
      </div>
      <div class="macbook-boot__base" aria-hidden="true"></div>
    </div>
    <button class="macbook-boot__skip" type="button" @click="enterDesktop">跳过动画</button>
  </section>
</template>

<style scoped>
.macbook-boot {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  height: 100%;
  min-height: 0;
  place-items: center;
  overflow: hidden;
  background: #f7f4ec;
  color: #1e2430;
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
}

.macbook-boot__computer {
  width: min(708px, calc(100% - 56px));
  animation: boot-arrive 180ms cubic-bezier(.16, 1, .3, 1) both;
}

.macbook-boot__screen {
  --boot-scale: 1;
  --boot-x: 0px;
  --boot-y: 0px;
  position: relative;
  display: flex;
  flex-direction: column;
  height: min(470px, 68cqh);
  min-height: min(300px, calc(100cqh - 80px));
  padding: clamp(20px, 3vw, 32px);
  overflow: hidden;
  border: 10px solid #192232;
  border-radius: 18px 18px 8px 8px;
  background: linear-gradient(145deg, #3b91e1, #2f83d6 46%, #2875c5);
  color: #fffdf7;
  box-shadow: 0 20px 60px rgb(25 34 50 / 12%);
  transform-origin: center;
}

.macbook-boot[data-state="zooming"] .macbook-boot__screen {
  transition: transform var(--boot-zoom-duration) cubic-bezier(.4, 0, .2, 1);
  transform: translate(var(--boot-x), var(--boot-y)) scale(var(--boot-scale));
  will-change: transform;
}

.macbook-boot__terminal {
  flex: 1;
  min-height: 0;
  overflow: auto;
  transition: opacity 320ms ease, transform 320ms cubic-bezier(.4, 0, .2, 1);
}

.macbook-boot[data-state="zooming"] .macbook-boot__terminal {
  opacity: 0;
  transform: scale(1.15);
}

.macbook-boot__terminal-bar {
  margin-bottom: 24px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgb(255 253 247 / 18%);
  color: rgb(255 253 247 / 70%);
  font-size: 11px;
  text-align: center;
}

.macbook-boot__terminal p {
  margin: 0 0 12px;
  overflow-wrap: anywhere;
  animation: boot-line-in 180ms ease-out both;
}

.macbook-boot__progress {
  color: #f4d758;
}

.macbook-boot[data-state="ready"] .macbook-boot__terminal p:last-child::after {
  display: inline-block;
  width: .55em;
  height: 1em;
  margin-left: 4px;
  background: currentColor;
  vertical-align: -.1em;
  content: "";
  animation: boot-caret 1s step-end infinite;
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
  flex: 0 0 auto;
  align-self: flex-start;
  min-width: 44px;
  min-height: 44px;
  margin-top: 20px;
  padding: 10px 16px;
  border: 2px solid #1e2430;
  border-radius: 8px;
  background: #F4D758;
  color: #1e2430;
  font: inherit;
  cursor: pointer;
  animation: boot-line-in 180ms ease-out backwards;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.macbook-boot__launch:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 12px rgb(25 34 50 / 18%);
}

.macbook-boot__launch:active {
  transform: scale(.98);
}

.macbook-boot__launch:focus-visible {
  outline: 3px solid #315efb;
  outline-offset: 3px;
}

.macbook-boot__base {
  width: calc(100% + 44px);
  height: 22px;
  margin-left: -22px;
  border-radius: 2px 2px 18px 18px;
  background: #69707d;
  transition: opacity 300ms ease;
}

.macbook-boot[data-state="zooming"] .macbook-boot__base {
  opacity: 0;
}

.macbook-boot__skip {
  position: absolute;
  right: max(24px, env(safe-area-inset-right));
  bottom: max(24px, env(safe-area-inset-bottom));
  min-height: 44px;
  padding: 8px 12px;
  border: 0;
  border-radius: 6px;
  background: #f7f4ec;
  color: #69707d;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
}

.macbook-boot__skip:focus-visible {
  outline: 3px solid #315efb;
  outline-offset: 3px;
}

@keyframes boot-arrive {
  from { opacity: 0; transform: translateY(20px) scale(.96); }
  to { opacity: 1; transform: none; }
}

@keyframes boot-line-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

@keyframes boot-caret {
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .macbook-boot *,
  .macbook-boot *::after {
    animation: none !important;
    transition: none !important;
  }
}

@container personal-os (max-width: 767px) {
  .macbook-boot__computer {
    width: calc(100% - 40px);
  }

  .macbook-boot__screen {
    height: min(390px, 64cqh);
    min-height: min(280px, calc(100cqh - 80px));
    padding: 24px 20px;
    border-width: 8px;
    border-radius: 14px 14px 6px 6px;
  }

  .macbook-boot__base {
    width: calc(100% + 28px);
    height: 18px;
    margin-left: -14px;
  }
}
</style>
