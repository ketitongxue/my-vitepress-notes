<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { IconArrowBackUp, IconDeviceFloppy, IconMaximize, IconMinus, IconPlus, IconRestore } from '@tabler/icons-vue'

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
    <div class="canvas-controls__scroll">
      <div class="canvas-controls__actions">
        <button type="button" aria-label="缩小画布" title="缩小画布" @click="emit('zoom-out')">
          <IconMinus :size="18" :stroke-width="1.6" aria-hidden="true" />
        </button>
        <output aria-label="当前画布缩放比例">{{ percentage }}</output>
        <button type="button" aria-label="放大画布" title="放大画布" @click="emit('zoom-in')">
          <IconPlus :size="18" :stroke-width="1.6" aria-hidden="true" />
        </button>
        <span class="canvas-controls__divider" aria-hidden="true"></span>
        <button class="canvas-controls__fit" type="button" aria-label="适应全部内容" title="适应全部内容" @click="emit('fit')">
          <IconMaximize :size="18" :stroke-width="1.6" aria-hidden="true" />
        </button>
        <button class="canvas-controls__undo" type="button" aria-label="撤销上一步" title="撤销上一步" :disabled="!canUndo" @click="emit('undo')">
          <IconArrowBackUp :size="18" :stroke-width="1.6" aria-hidden="true" />
        </button>
        <button class="canvas-controls__save" type="button" aria-label="保存画布布局" title="保存画布布局" @click="emit('save')">
          <IconDeviceFloppy :size="18" :stroke-width="1.6" aria-hidden="true" />
        </button>
        <button ref="resetButton" class="canvas-controls__reset" type="button" aria-label="恢复默认布局" title="恢复默认布局" @click="requestReset">
          <IconRestore :size="18" :stroke-width="1.6" aria-hidden="true" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.canvas-controls {
  position: fixed;
  right: 24px;
  bottom: max(22px, calc(env(safe-area-inset-bottom) + 14px));
  z-index: 31;
  max-width: calc(100vw - 48px);
  color: #3c5266;
  font: 12px/1.4 "PingFang SC", "Microsoft YaHei", sans-serif;
}

.canvas-controls__scroll,
.canvas-controls__confirm {
  border: 1px solid rgb(87 111 128 / 24%);
  border-radius: 14px;
  background: #fffdf6;
  box-shadow: 0 8px 24px rgb(22 60 103 / 18%), inset 0 1px 0 rgb(255 255 255 / 85%);
}

.canvas-controls__scroll {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.canvas-controls__scroll::-webkit-scrollbar {
  display: none;
}

.canvas-controls__actions,
.canvas-controls__confirm {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 4px;
}

.canvas-controls__actions {
  width: max-content;
  min-width: 100%;
}

.canvas-controls__confirm {
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  width: max-content;
  max-width: 100%;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px;
  padding-left: 12px;
}

.canvas-controls__confirm > span {
  margin-right: 6px;
}

.canvas-controls button {
  display: inline-flex;
  min-width: 44px;
  min-height: 44px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: background-color 170ms ease, color 170ms ease, transform 170ms ease;
}

.canvas-controls button:hover:not(:disabled) {
  background: #e8f1fb;
  color: #286bb0;
}

.canvas-controls button:active:not(:disabled) {
  transform: translateY(1px);
}

.canvas-controls button:disabled {
  opacity: .36;
  cursor: not-allowed;
}

.canvas-controls button:focus-visible {
  outline: 3px solid #367bb8;
  outline-offset: -2px;
}

.canvas-controls__confirm button:first-of-type {
  background: #e8f1fb;
  color: #286bb0;
}

.canvas-controls__actions .canvas-controls__save {
  color: #286bb0;
}

.canvas-controls output {
  min-width: 46px;
  padding-inline: 5px;
  color: #4f6478;
  font: 11px/1 "JetBrains Mono", Consolas, monospace;
  text-align: center;
}

.canvas-controls__divider {
  width: 1px;
  height: 20px;
  flex-shrink: 0;
  margin-inline: 4px;
  background: rgb(87 111 128 / 20%);
}

@media (min-width: 768px) and (max-width: 1100px) {
  .canvas-controls {
    bottom: max(82px, calc(env(safe-area-inset-bottom) + 74px));
  }
}

@media (max-width: 767px) {
  .canvas-controls {
    right: 12px;
    bottom: max(80px, calc(env(safe-area-inset-bottom) + 72px));
    left: 12px;
    max-width: none;
  }

  .canvas-controls__actions {
    justify-content: center;
  }
}

@media (max-height: 559px) and (orientation: landscape) {
  .canvas-controls {
    right: max(12px, env(safe-area-inset-right));
    bottom: max(12px, env(safe-area-inset-bottom));
    left: auto;
    width: min(366px, calc(100vw - 216px));
  }
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
