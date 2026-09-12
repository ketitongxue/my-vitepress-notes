<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IconSparkle } from '@tabler/icons-vue'

const props = defineProps({ active: { type: Boolean, default: false } })
const field = ref(null)
const starElements = ref([])
const reducedMotion = ref(true)
const finePointer = ref(false)
const pageVisible = ref(true)
const inViewport = ref(true)
const running = computed(() => props.active && pageVisible.value && inViewport.value && !reducedMotion.value)
const stars = Object.freeze([
  [8, 13, 13], [25, 21, 8], [44, 12, 10], [64, 18, 8], [84, 11, 12],
  [15, 36, 9], [34, 42, 12], [56, 31, 8], [75, 40, 11], [93, 31, 8],
  [5, 62, 10], [23, 67, 8], [46, 58, 13], [66, 69, 9], [86, 60, 12],
  [13, 87, 8], [36, 82, 11], [57, 91, 8], [77, 83, 12], [95, 91, 8],
  [18, 53, 6], [39, 28, 7], [51, 76, 6], [69, 51, 7], [90, 77, 6],
  [6, 27, 6], [31, 94, 7], [59, 8, 6], [82, 26, 7], [97, 48, 6],
].map(([x, y, size], index) => ({
  x, y, size,
  twinkle: 2.4 + (index % 9) * .2,
  wobble: 3.2 + (index % 10) * .2,
  delay: -index * .37,
})))
let frameId = null
let pointer = null
let motionQuery
let pointerQuery
let viewportObserver

function clearPointer() {
  pointer = null
  if (frameId !== null) window.cancelAnimationFrame(frameId)
  frameId = null
  for (const star of starElements.value) {
    star?.style.setProperty('--star-push-x', '0px')
    star?.style.setProperty('--star-push-y', '0px')
  }
}

function applyPointer() {
  frameId = null
  if (!pointer || !field.value || !running.value || !finePointer.value) return
  const bounds = field.value.getBoundingClientRect()
  const localX = pointer.x - bounds.left
  const localY = pointer.y - bounds.top
  for (let index = 0; index < stars.length; index += 1) {
    const star = stars[index]
    const element = starElements.value[index]
    if (!element) continue
    const dx = star.x / 100 * bounds.width - localX
    const dy = star.y / 100 * bounds.height - localY
    const distance = Math.hypot(dx, dy)
    const strength = Math.max(0, 1 - distance / 150) * 15
    // A fixed direction at the exact center avoids division by zero.
    const x = distance > 0 ? dx / distance * strength : strength
    const y = distance > 0 ? dy / distance * strength : 0
    element.style.setProperty('--star-push-x', `${x.toFixed(2)}px`)
    element.style.setProperty('--star-push-y', `${y.toFixed(2)}px`)
  }
}

function movePointer(event) {
  if (!running.value || !finePointer.value || event.pointerType !== 'mouse') return
  if (event.buttons) {
    clearPointer()
    return
  }
  pointer = { x: event.clientX, y: event.clientY }
  if (frameId === null) frameId = window.requestAnimationFrame(applyPointer)
}

function updatePreferences() {
  reducedMotion.value = motionQuery?.matches ?? true
  finePointer.value = pointerQuery?.matches ?? false
  if (reducedMotion.value || !finePointer.value) clearPointer()
}

function updateVisibility() {
  pageVisible.value = document.visibilityState !== 'hidden'
}

watch(running, (active) => { if (!active) clearPointer() })

onMounted(() => {
  motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  pointerQuery = window.matchMedia?.('(hover: hover) and (pointer: fine) and (min-width: 768px)')
  updatePreferences()
  updateVisibility()
  motionQuery?.addEventListener('change', updatePreferences)
  pointerQuery?.addEventListener('change', updatePreferences)
  document.addEventListener('visibilitychange', updateVisibility)
  if (typeof IntersectionObserver === 'function') {
    viewportObserver = new IntersectionObserver(([entry]) => { inViewport.value = entry.isIntersecting })
    viewportObserver.observe(field.value)
  }
})

onBeforeUnmount(() => {
  clearPointer()
  viewportObserver?.disconnect()
  motionQuery?.removeEventListener('change', updatePreferences)
  pointerQuery?.removeEventListener('change', updatePreferences)
  document.removeEventListener('visibilitychange', updateVisibility)
})

defineExpose({ movePointer, clearPointer })
</script>

<template>
  <div ref="field" class="desktop-atmosphere" :class="{ 'is-running': running }" aria-hidden="true">
    <span
      v-for="(star, index) in stars"
      :key="index"
      :ref="(element) => { starElements[index] = element }"
      class="desktop-atmosphere__star"
      :class="{ 'desktop-atmosphere__star--warm': index % 3 === 0 }"
      :style="{
        left: `${star.x}%`, top: `${star.y}%`, width: `${star.size}px`, height: `${star.size}px`,
        '--star-twinkle': `${star.twinkle}s`, '--star-wobble': `${star.wobble}s`,
        '--star-delay': `${star.delay}s`,
      }"
    >
      <span class="desktop-atmosphere__shape"><IconSparkle :stroke-width="1.3" /></span>
    </span>
  </div>
</template>

<style scoped>
.desktop-atmosphere {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  contain: layout paint;
}

.desktop-atmosphere__star {
  position: absolute;
  color: rgb(237 245 252 / 78%);
  transform: translate(var(--star-push-x, 0px), var(--star-push-y, 0px));
  transition: transform 300ms ease-out;
}

.desktop-atmosphere__star--warm {
  color: rgb(244 215 88 / 80%);
}

.desktop-atmosphere__shape {
  display: block;
  width: 100%;
  height: 100%;
  animation: desktop-star-wobble var(--star-wobble) ease-in-out var(--star-delay) infinite;
  animation-play-state: paused;
}

.desktop-atmosphere__shape :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  animation: desktop-star-twinkle var(--star-twinkle) ease-in-out var(--star-delay) infinite;
  animation-play-state: paused;
}

.is-running .desktop-atmosphere__shape,
.is-running .desktop-atmosphere__shape :deep(svg) {
  animation-play-state: running;
}

@keyframes desktop-star-twinkle {
  0%, 100% { opacity: .25; transform: scale(.7); }
  50% { opacity: .85; transform: scale(1.12); }
}

@keyframes desktop-star-wobble {
  0%, 100% { transform: translateY(-2px) rotate(-12deg); }
  50% { transform: translateY(2px) rotate(12deg); }
}

@media (max-width: 767px), (hover: none) {
  .desktop-atmosphere__star:nth-child(2n),
  .desktop-atmosphere__star:nth-child(n + 21) {
    display: none;
  }

  .desktop-atmosphere__star,
  .desktop-atmosphere__shape,
  .desktop-atmosphere__shape :deep(svg) {
    animation: none;
    transition: none;
    opacity: .6;
  }
}

@media (prefers-reduced-motion: reduce) {
  .desktop-atmosphere__star,
  .desktop-atmosphere__shape,
  .desktop-atmosphere__shape :deep(svg) {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
</style>
