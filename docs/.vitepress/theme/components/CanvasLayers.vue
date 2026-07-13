<script setup>
import { ref } from 'vue'

defineProps({
  cards: { type: Array, required: true },
  selectedCardId: { type: String, default: null },
})

const emit = defineEmits(['focus', 'visibility'])
const expanded = ref(false)

function togglePanel() {
  expanded.value = !expanded.value
}

function changeVisibility(card, event) {
  emit('visibility', { id: card.id, visible: event.target.checked })
}
</script>

<template>
  <aside
    class="canvas-layers"
    :class="{ 'is-open': expanded }"
    aria-label="画布图层"
    data-canvas-control
    @pointerdown.stop
    @wheel.stop
  >
    <button
      type="button"
      class="canvas-layers__toggle"
      :aria-expanded="expanded"
      aria-controls="canvas-layer-list"
      aria-label="切换画布图层面板"
      @click="togglePanel"
    >图层</button>

    <div id="canvas-layer-list" class="canvas-layers__list">
      <strong class="canvas-layers__heading">LAYERS</strong>
      <div
        v-for="card in cards"
        :key="card.id"
        class="canvas-layers__row"
      >
        <button
          type="button"
          class="canvas-layers__focus"
          :disabled="card.visible === false"
          :aria-current="selectedCardId === card.id ? 'true' : undefined"
          :aria-label="`聚焦 ${card.title}`"
          @click="emit('focus', card.id)"
        >{{ card.title }}</button>
        <label class="canvas-layers__visibility">
          <input
            type="checkbox"
            :checked="card.visible !== false"
            :aria-label="`显示 ${card.title}`"
            @change="changeVisibility(card, $event)"
          >
          <span aria-hidden="true">显示</span>
        </label>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.canvas-layers {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 30;
  width: min(240px, calc(100vw - 36px));
  border: 1px solid #1e2430;
  background: #fffdf7;
  color: #1e2430;
  font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.canvas-layers__toggle {
  display: none;
}

.canvas-layers__list {
  padding: 10px;
}

.canvas-layers__heading {
  display: block;
  padding: 2px 4px 8px;
  letter-spacing: .08em;
}

.canvas-layers__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  border-top: 1px solid #d8d3c8;
}

.canvas-layers__focus {
  min-width: 0;
  padding: 8px 4px;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.canvas-layers__focus[aria-current="true"] {
  color: #315efb;
  font-weight: 700;
}

.canvas-layers__focus:disabled {
  color: #69707d;
  cursor: not-allowed;
}

.canvas-layers__visibility {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 2px;
  cursor: pointer;
}

.canvas-layers__focus:focus-visible,
.canvas-layers__toggle:focus-visible,
.canvas-layers__visibility input:focus-visible {
  outline: 3px solid #315efb;
  outline-offset: 2px;
}

@media (max-width: 767px) {
  .canvas-layers {
    top: 10px;
    left: 10px;
    width: min(240px, calc(100vw - 20px));
    border: 0;
    background: transparent;
  }

  .canvas-layers__toggle {
    display: inline-flex;
    min-width: 44px;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    border: 1px solid #1e2430;
    background: #fffdf7;
    color: #1e2430;
  }

  .canvas-layers__list {
    display: none;
    margin-top: 6px;
    border: 1px solid #1e2430;
    background: #fffdf7;
  }

  .canvas-layers.is-open .canvas-layers__list {
    display: block;
  }
}
</style>
