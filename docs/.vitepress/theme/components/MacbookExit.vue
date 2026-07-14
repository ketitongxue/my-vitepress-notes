<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { exitFrame, normalizeExitProgress } from './homeExitState.mjs'

const section = ref(null)
let frameId = 0
let mounted = false
let reducedMotion = false

function applyFrame(frame) {
  if (!mounted || !section.value) return
  section.value.style.setProperty('--exit-panel-scale', String(frame.panelScale))
  section.value.style.setProperty('--exit-computer-opacity', String(frame.computerOpacity))
  section.value.style.setProperty('--exit-terminal-opacity', String(frame.terminalOpacity))
}

function updateFrame() {
  frameId = 0
  if (!mounted || !section.value) return
  if (reducedMotion) {
    applyFrame(exitFrame(1))
    return
  }

  const bounds = section.value.getBoundingClientRect()
  const start = window.scrollY + bounds.top
  const end = start + section.value.offsetHeight - window.innerHeight
  applyFrame(exitFrame(normalizeExitProgress(window.scrollY, start, end)))
}

function scheduleFrame() {
  if (!mounted || frameId) return
  frameId = window.requestAnimationFrame(updateFrame)
}

onMounted(() => {
  mounted = true
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    reducedMotion = true
  }
  if (reducedMotion) {
    applyFrame(exitFrame(1))
    return
  }
  window.addEventListener('scroll', scheduleFrame, { passive: true })
  window.addEventListener('resize', scheduleFrame)
  scheduleFrame()
})

onBeforeUnmount(() => {
  mounted = false
  window.removeEventListener('scroll', scheduleFrame)
  window.removeEventListener('resize', scheduleFrame)
  if (frameId) window.cancelAnimationFrame(frameId)
  frameId = 0
})
</script>

<template>
  <section ref="section" class="macbook-exit" aria-labelledby="macbook-exit-title">
    <div class="macbook-exit__sticky">
      <div class="macbook-exit__panel">
        <div class="macbook-exit__terminal">
          <h2 id="macbook-exit-title">JuZX@digital-factory ~ zsh</h2>
          <p>$ logout</p>
          <p>Session complete.</p>
        </div>
      </div>
      <div class="macbook-exit__frame" aria-hidden="true"></div>
      <div class="macbook-exit__base" aria-hidden="true"></div>
    </div>
  </section>
</template>

<style scoped>
.macbook-exit {
  --exit-panel-scale: 1;
  --exit-computer-opacity: 0;
  --exit-terminal-opacity: 0;
  position: relative;
  width: 100%;
  min-height: 300vh;
  min-height: 300dvh;
  overflow: clip;
  background: #F7F4EC;
  pointer-events: none;
}

.macbook-exit__sticky {
  position: sticky;
  top: 0;
  display: grid;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  place-items: center;
  overflow: hidden;
}

.macbook-exit__panel,
.macbook-exit__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: scale(var(--exit-panel-scale));
  transform-origin: center;
}

.macbook-exit__panel {
  display: grid;
  z-index: 2;
  place-items: center;
  overflow: hidden;
  background: #2B7FD8;
}

.macbook-exit__frame {
  z-index: 3;
  border: clamp(10px, 1.4vw, 20px) solid #192232;
  border-radius: 20px 20px 8px 8px;
  opacity: var(--exit-computer-opacity);
}

.macbook-exit__base {
  position: absolute;
  z-index: 4;
  top: calc(50% + 21vh);
  width: min(48vw, 760px);
  height: clamp(14px, 1.8vw, 24px);
  border-radius: 2px 2px 18px 18px;
  background: #69707D;
  opacity: var(--exit-computer-opacity);
}

.macbook-exit__terminal {
  width: min(680px, 72vw);
  padding: clamp(24px, 5vw, 52px);
  color: #FFFDF7;
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  opacity: var(--exit-terminal-opacity);
}

.macbook-exit__terminal h2,
.macbook-exit__terminal p {
  margin: 0 0 14px;
  border: 0;
  color: inherit;
  font-size: clamp(14px, 2vw, 20px);
  line-height: 1.6;
  overflow-wrap: anywhere;
}

@media (max-width: 767px) {
  .macbook-exit {
    max-width: 100vw;
  }

  .macbook-exit__base {
    top: calc(50% + 21vh);
    width: 52vw;
  }

  .macbook-exit__terminal {
    width: 78vw;
    padding: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .macbook-exit {
    --exit-panel-scale: .42;
    --exit-computer-opacity: 1;
    --exit-terminal-opacity: 1;
    min-height: 100vh;
    min-height: 100dvh;
  }
}
</style>
