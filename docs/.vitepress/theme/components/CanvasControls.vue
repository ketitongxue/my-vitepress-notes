<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

const { scale, canUndo } = defineProps({
  scale: { type: Number, default: 1 },
  canUndo: { type: Boolean, default: false },
})

const emit = defineEmits(['zoom-in', 'zoom-out', 'fit', 'undo', 'save', 'reset'])
const confirmingReset = ref(false)
const resetButton = ref(null)
const confirmButton = ref(null)
const percentage = computed(() => `${Math.round(scale * 100)}%`)
const stopCanvasGesture = (event) => event.stopPropagation()
const gestureGuards = { pointerdown: stopCanvasGesture, wheel: stopCanvasGesture }
let escapeListening = false

function handleWindowKeydown(event) {
  if (event.key !== 'Escape' || !confirmingReset.value) return
  event.preventDefault()
  event.stopPropagation()
  void cancelReset()
}

function startEscapeListener() {
  if (escapeListening) return
  window.addEventListener('keydown', handleWindowKeydown)
  escapeListening = true
}

function stopEscapeListener() {
  if (!escapeListening) return
  window.removeEventListener('keydown', handleWindowKeydown)
  escapeListening = false
}

async function requestReset() {
  if (confirmingReset.value) return
  confirmingReset.value = true
  startEscapeListener()
  await nextTick()
  confirmButton.value?.focus()
}

async function cancelReset() {
  if (!confirmingReset.value) return
  stopEscapeListener()
  confirmingReset.value = false
  await nextTick()
  resetButton.value?.focus()
}

async function confirmReset() {
  if (!confirmingReset.value) return
  stopEscapeListener()
  confirmingReset.value = false
  emit('reset')
  await nextTick()
  resetButton.value?.focus()
}

onBeforeUnmount(stopEscapeListener)
</script>

<template>
  <aside
    class="canvas-controls"
    aria-label="画布控制"
    data-canvas-control
    v-on="gestureGuards"
  >
    <div
      v-if="confirmingReset"
      class="canvas-controls__confirm"
      role="group" aria-label="确认恢复默认布局"
    >
      <span>恢复默认布局？</span>
      <button ref="confirmButton" type="button" aria-label="确认恢复默认" @click="confirmReset">确认</button>
      <button type="button" aria-label="取消恢复默认" @click="cancelReset">取消</button>
    </div>
    <div class="canvas-controls__actions">
      <button type="button" aria-label="缩小画布" @click="emit('zoom-out')">−</button>
      <output aria-label="当前画布缩放比例">{{ percentage }}</output>
      <button type="button" aria-label="放大画布" @click="emit('zoom-in')">+</button>
      <button class="canvas-controls__fit" type="button" aria-label="适应全部内容" @click="emit('fit')"><span>适应</span></button>
      <button class="canvas-controls__undo" type="button" aria-label="撤销上一步" :disabled="!canUndo" @click="emit('undo')"><span>撤销</span></button>
      <button class="canvas-controls__save" type="button" aria-label="保存画布布局" @click="emit('save')"><span>保存</span></button>
      <button ref="resetButton" class="canvas-controls__reset" type="button" aria-label="恢复默认布局" @click="requestReset"><span>重置</span></button>
    </div>
  </aside>
</template>

<style scoped>
.canvas-controls {
  position: fixed;
  right: 18px;
  bottom: max(76px, calc(env(safe-area-inset-bottom) + 68px));
  z-index: 31;
  color: #1e2430;
  font: 12px/1 "JetBrains Mono", "Fira Code", Consolas, monospace;
}

.canvas-controls__actions,
.canvas-controls__confirm {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border: 1px solid #1e2430;
  border-radius: 5px;
  background: #fffdf7;
}

.canvas-controls__confirm {
  width: max-content;
  justify-content: flex-end;
  margin-bottom: 6px;
  margin-left: auto;
}

.canvas-controls button {
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid #69707d;
  background: #f7f4ec;
  color: inherit;
  cursor: pointer;
}

.canvas-controls button:disabled {
  color: #9a9da4;
  cursor: not-allowed;
}

.canvas-controls button:focus-visible {
  outline: 3px solid #315efb;
  outline-offset: 2px;
}

.canvas-controls output {
  min-width: 48px;
  text-align: center;
}

@media (max-width: 767px) {
  .canvas-controls {
    left: 60px;
    right: 8px;
    max-width: none;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .canvas-controls::-webkit-scrollbar {
    display: none;
  }

  .canvas-controls__actions {
    width: max-content;
  }

  .canvas-controls output {
    min-width: 44px;
  }

  .canvas-controls button {
    min-width: 44px;
    min-height: 44px;
  }

  .canvas-controls__actions button span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .canvas-controls__fit::after { content: "◎"; }
  .canvas-controls__undo::after { content: "↶"; }
  .canvas-controls__save::after { content: "↓"; }
  .canvas-controls__reset::after { content: "↺"; }
}

@media (prefers-reduced-motion: reduce) {
  .canvas-controls,
  .canvas-controls :where(button, output) {
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
    transition-duration: 1ms !important;
  }
}
</style>
