<script setup>
import { computed, ref } from 'vue'
import CanvasMinimap from './CanvasMinimap.vue'

const props = defineProps({
  cards: { type: Array, required: true },
  selectedCardId: { type: String, default: null },
  transform: { type: Object, required: true },
  viewport: { type: Object, required: true },
  worldBounds: { type: Object, required: true },
})

const emit = defineEmits(['focus', 'visibility', 'navigate'])
const expanded = ref(false)
const layersToggle = ref(null)
const visibleCount = computed(() => props.cards.filter((card) => card.visible !== false).length)

function closePanel() {
  layersToggle.value?.focus()
  expanded.value = false
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
    <div class="canvas-layers__rail">
      <button
        ref="layersToggle"
        type="button"
        class="canvas-layers__toggle"
        :aria-expanded="expanded"
        aria-controls="canvas-layers-panel"
        aria-label="展开或收起画布图层"
        @click="expanded = !expanded"
      >图层</button>
      <output :aria-label="`当前显示 ${visibleCount} 个图层`">{{ visibleCount }}</output>
    </div>

    <div
      id="canvas-layers-panel"
      class="canvas-layers__panel"
      :aria-hidden="!expanded"
      :inert="!expanded || undefined"
    >
      <header class="canvas-layers__header">
        <strong>LAYERS</strong>
        <button type="button" aria-label="收起画布图层" @click="closePanel">×</button>
      </header>

      <ol class="canvas-layers__list">
        <li v-for="card in cards" :key="card.id" class="canvas-layers__row">
          <button
            type="button"
            class="canvas-layers__focus"
            :disabled="card.visible === false"
            :aria-current="selectedCardId === card.id ? 'true' : undefined"
            :aria-label="`聚焦 ${card.title}`"
            @click="emit('focus', card.id)"
          >{{ card.title }}</button>
          <button
            type="button"
            class="canvas-layers__visibility"
            :aria-label="`${card.visible !== false ? '隐藏' : '显示'} ${card.title}`"
            :aria-pressed="card.visible !== false"
            @click="emit('visibility', { id: card.id, visible: card.visible === false })"
          ><span aria-hidden="true">{{ card.visible !== false ? '●' : '○' }}</span></button>
        </li>
      </ol>

      <CanvasMinimap
        :cards="cards"
        :transform="transform"
        :viewport="viewport"
        :world-bounds="worldBounds"
        @navigate="emit('navigate', $event)"
      />
    </div>
  </aside>
</template>

<style scoped>
.canvas-layers {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 30;
  width: 48px;
  color: #1e2430;
  font: 12px/1.35 "JetBrains Mono", "Fira Code", Consolas, monospace;
}

.canvas-layers__rail {
  display: flex;
  width: 48px;
  height: 100%;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px 2px;
  border-right: 1px solid #b9c7db;
  background: #fffdf7;
}

.canvas-layers__toggle,
.canvas-layers__header button,
.canvas-layers__focus,
.canvas-layers__visibility {
  color: inherit;
  font: inherit;
}

.canvas-layers__toggle {
  display: inline-flex;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  writing-mode: vertical-rl;
}

.canvas-layers__toggle:hover,
.canvas-layers__toggle[aria-expanded="true"] {
  border-color: #b9c7db;
  background: #f7f4ec;
}

.canvas-layers__rail output {
  display: inline-grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid #b9c7db;
  border-radius: 50%;
  color: #315efb;
  font-weight: 700;
}

.canvas-layers__panel {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 48px;
  display: flex;
  width: 220px;
  flex-direction: column;
  overflow: auto;
  border-right: 1px solid #b9c7db;
  background: #fffdf7;
}

.canvas-layers:not(.is-open) .canvas-layers__panel {
  visibility: hidden;
  pointer-events: none;
}

.canvas-layers__header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 8px 14px;
  border-bottom: 1px solid #d8d3c8;
  letter-spacing: .08em;
}

.canvas-layers__header button {
  display: inline-grid;
  min-width: 44px;
  min-height: 44px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
}

.canvas-layers__list {
  flex: 1 0 auto;
  margin: 0;
  padding: 0 10px;
  list-style: none;
}

.canvas-layers__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  align-items: center;
  border-bottom: 1px solid #e2ded4;
}

.canvas-layers__focus {
  min-width: 0;
  min-height: 44px;
  padding: 8px 4px;
  overflow: hidden;
  border: 0;
  background: transparent;
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
  display: inline-grid;
  min-width: 44px;
  min-height: 44px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #315efb;
  cursor: pointer;
}

.canvas-layers__visibility[aria-pressed="false"] {
  color: #69707d;
}

.canvas-layers__toggle:focus-visible,
.canvas-layers__header button:focus-visible,
.canvas-layers__focus:focus-visible,
.canvas-layers__visibility:focus-visible {
  outline: 3px solid #315efb;
  outline-offset: 2px;
}

@media (max-width: 767px) {
  .canvas-layers {
    position: fixed;
    inset: auto 0 max(64px, calc(env(safe-area-inset-bottom) + 56px));
    bottom: max(64px, calc(env(safe-area-inset-bottom) + 56px));
    width: 100%;
    height: 44px;
    pointer-events: none;
  }

  .canvas-layers.is-open {
    z-index: 32;
  }

  .canvas-layers__rail {
    width: 100%;
    height: 44px;
    align-items: flex-start;
    padding: 0 max(10px, env(safe-area-inset-left));
    border: 0;
    background: transparent;
    pointer-events: none;
  }

  .canvas-layers.is-open .canvas-layers__rail {
    background: #fffdf7;
    pointer-events: auto;
  }

  .canvas-layers__toggle {
    min-width: 44px;
    min-height: 44px;
    border: 1px solid #1e2430;
    background: #fffdf7;
    pointer-events: auto;
    writing-mode: horizontal-tb;
  }

  .canvas-layers__rail output {
    display: none;
  }

  .canvas-layers__panel {
    position: absolute;
    right: 0;
    bottom: 44px;
    left: 0;
    top: auto;
    width: 100%;
    max-height: min(62vh, 520px);
    max-height: min(62dvh, 520px);
    padding-bottom: env(safe-area-inset-bottom);
    overflow: auto;
    border: 1px solid #b9c7db;
    border-radius: 16px 16px 0 0;
    background: #fffdf7;
    pointer-events: auto;
  }

  .canvas-layers__list {
    flex: 0 0 auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .canvas-layers,
  .canvas-layers :where(button) {
    transition: none !important;
  }
}
</style>
