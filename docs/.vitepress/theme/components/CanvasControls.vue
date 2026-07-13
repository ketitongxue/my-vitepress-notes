<script setup>
import { computed, ref } from 'vue'

const { scale, canUndo } = defineProps({
  scale: { type: Number, default: 1 },
  canUndo: { type: Boolean, default: false },
})

const emit = defineEmits(['zoom-in', 'zoom-out', 'fit', 'undo', 'save', 'reset'])
const confirmingReset = ref(false)
const percentage = computed(() => `${Math.round(scale * 100)}%`)
const stopCanvasGesture = (event) => event.stopPropagation()
const gestureGuards = { pointerdown: stopCanvasGesture, wheel: stopCanvasGesture }

function requestReset() {
  confirmingReset.value = true
}

function cancelReset() {
  confirmingReset.value = false
}

function confirmReset() {
  confirmingReset.value = false
  emit('reset')
}
</script>

<template>
  <aside
    class="canvas-controls"
    aria-label="画布控制"
    data-canvas-control
    v-on="gestureGuards"
  >
    <div class="canvas-controls__actions">
      <button type="button" aria-label="缩小画布" @click="emit('zoom-out')">−</button>
      <output aria-label="当前画布缩放比例">{{ percentage }}</output>
      <button type="button" aria-label="放大画布" @click="emit('zoom-in')">+</button>
      <button type="button" aria-label="适应全部内容" @click="emit('fit')">适应</button>
      <button type="button" aria-label="撤销上一步" :disabled="!canUndo" @click="emit('undo')">撤销</button>
      <button type="button" aria-label="保存画布布局" @click="emit('save')">保存</button>
      <button type="button" aria-label="恢复默认布局" @click="requestReset">恢复默认</button>
    </div>
    <div v-if="confirmingReset" class="canvas-controls__confirm" role="group" aria-label="确认恢复默认布局">
      <span>恢复默认布局？</span>
      <button type="button" aria-label="确认恢复默认" @click="confirmReset">确认恢复默认</button>
      <button type="button" aria-label="取消恢复默认" @click="cancelReset">取消</button>
    </div>
  </aside>
</template>

<style scoped>
.canvas-controls {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 31;
  color: #1e2430;
  font: 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.canvas-controls__actions,
.canvas-controls__confirm {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border: 1px solid #1e2430;
  background: #fffdf7;
}

.canvas-controls__confirm {
  justify-content: flex-end;
  margin-bottom: 6px;
}

.canvas-controls button {
  min-height: 34px;
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
  outline: 3px solid #f2c94c;
  outline-offset: 2px;
}

.canvas-controls output {
  min-width: 48px;
  text-align: center;
}

@media (max-width: 767px) {
  .canvas-controls {
    right: 10px;
    bottom: 10px;
    left: 10px;
    overflow-x: auto;
  }

  .canvas-controls__actions {
    width: max-content;
    min-width: 100%;
  }

  .canvas-controls button {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
