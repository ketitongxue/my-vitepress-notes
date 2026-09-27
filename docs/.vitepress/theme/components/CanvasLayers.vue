<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { IconEye, IconEyeOff, IconStack2, IconX } from '@tabler/icons-vue'

const props = defineProps({
  cards: { type: Array, required: true },
  selectedCardId: { type: String, default: null },
})

const emit = defineEmits(['focus', 'visibility'])
const expanded = ref(false)
const layersRoot = ref(null)
const layersToggle = ref(null)
const visibleCount = computed(() => props.cards.filter((card) => card.visible !== false).length)

function focusLayer(id) {
  closePanel()
  emit('focus', id)
}

function closePanel() {
  layersToggle.value?.focus()
  expanded.value = false
}

function closeOnOutsidePointer(event) {
  if (expanded.value && !layersRoot.value?.contains(event.target)) expanded.value = false
}

onMounted(() => document.addEventListener('pointerdown', closeOnOutsidePointer, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOnOutsidePointer, true))
</script>

<template>
  <aside
    ref="layersRoot"
    class="canvas-layers"
    :class="{ 'is-open': expanded }"
    aria-label="画布图层"
    data-canvas-control
    @pointerdown.stop
    @wheel.stop
    @keydown.esc.stop.prevent="closePanel"
  >
    <button
      ref="layersToggle"
      type="button"
      class="canvas-layers__toggle"
      :aria-expanded="expanded"
      aria-controls="canvas-layers-panel"
      :aria-label="`${expanded ? '收起' : '展开'}画布图层，当前显示 ${visibleCount} 个图层`"
      @click="expanded = !expanded"
    >
      <IconStack2 :size="18" :stroke-width="1.6" aria-hidden="true" />
      <span>图层</span>
      <span class="canvas-layers__count" aria-hidden="true">{{ visibleCount }}</span>
    </button>

    <div
      id="canvas-layers-panel"
      class="canvas-layers__panel"
      :aria-hidden="!expanded"
      :inert="!expanded || undefined"
    >
      <header class="canvas-layers__header">
        <div>
          <span>WORKSPACE</span>
          <strong>画布图层</strong>
        </div>
        <button type="button" aria-label="收起画布图层" title="收起图层" @click="closePanel">
          <IconX :size="18" :stroke-width="1.6" aria-hidden="true" />
        </button>
      </header>

      <ol class="canvas-layers__list">
        <li v-for="card in cards" :key="card.id" class="canvas-layers__row">
          <button
            type="button"
            class="canvas-layers__focus"
            :disabled="card.visible === false"
            :aria-current="selectedCardId === card.id ? 'true' : undefined"
            :aria-label="`聚焦 ${card.title}`"
            @click="focusLayer(card.id)"
          >{{ card.title }}</button>
          <button
            type="button"
            class="canvas-layers__visibility"
            :aria-label="`${card.visible !== false ? '隐藏' : '显示'} ${card.title}`"
            :aria-pressed="card.visible !== false"
            @click="emit('visibility', { id: card.id, visible: card.visible === false })"
          >
            <component :is="card.visible !== false ? IconEye : IconEyeOff" :size="18" :stroke-width="1.6" aria-hidden="true" />
          </button>
        </li>
      </ol>
    </div>
  </aside>
</template>

<style scoped>
.canvas-layers {
  position: fixed;
  top: 146px;
  left: 24px;
  z-index: 30;
  color: #4f534c;
  font: 12px/1.45 "PingFang SC", "Microsoft YaHei", sans-serif;
}

.canvas-layers.is-open {
  z-index: 32;
}

.canvas-layers :where(button) {
  color: inherit;
  font: inherit;
}

.canvas-layers__toggle {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 11px;
  border: 1px dashed #cec8bb;
  border-radius: 13px;
  background: #fffcf5;
  box-shadow: 0 3px 12px rgb(70 65 51 / 7%), inset 0 1px 0 rgb(255 255 255 / 85%);
  cursor: pointer;
  transition: background-color 180ms ease, box-shadow 180ms ease;
}

.canvas-layers__toggle:hover,
.canvas-layers__toggle[aria-expanded="true"] {
  background: #f6f0de;
  box-shadow: 0 4px 14px rgb(70 65 51 / 10%);
}

.canvas-layers__toggle > svg {
  color: #716849;
}

.canvas-layers__count {
  display: inline-grid;
  min-width: 24px;
  height: 24px;
  padding-inline: 5px;
  place-items: center;
  border-radius: 7px;
  background: #f0e7c6;
  color: #625a3f;
  font: 600 11px/1 "JetBrains Mono", Consolas, monospace;
}

.canvas-layers__panel {
  position: absolute;
  top: 54px;
  left: 0;
  display: flex;
  width: 248px;
  max-height: min(480px, calc(var(--os-viewport-height, 100dvh) - 288px));
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #d8d3c7;
  border-radius: 16px;
  background: #fffcf5;
  box-shadow: 0 8px 24px rgb(70 65 51 / 10%), inset 0 1px 0 rgb(255 255 255 / 85%);
}

.canvas-layers:not(.is-open) .canvas-layers__panel {
  visibility: hidden;
  pointer-events: none;
}

.canvas-layers__header {
  display: flex;
  min-height: 64px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 7px 8px 7px 17px;
  border-bottom: 1px dashed #ded9cd;
}

.canvas-layers__header > div {
  display: grid;
  gap: 2px;
}

.canvas-layers__header span {
  color: #707367;
  font: 9px/1.4 "JetBrains Mono", Consolas, monospace;
  letter-spacing: .12em;
}

.canvas-layers__header strong {
  font-size: 13px;
  font-weight: 600;
}

.canvas-layers__header button,
.canvas-layers__visibility {
  display: inline-grid;
  width: 44px;
  min-height: 44px;
  place-items: center;
  border: 0;
  border-radius: 9px;
  background: transparent;
  cursor: pointer;
}

.canvas-layers__list {
  min-height: 0;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  list-style: none;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.canvas-layers__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  align-items: center;
  gap: 2px;
}

.canvas-layers__row + .canvas-layers__row {
  margin-top: 2px;
}

.canvas-layers__focus {
  min-width: 0;
  min-height: 44px;
  padding: 9px;
  overflow: hidden;
  border: 0;
  border-radius: 9px;
  background: transparent;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.canvas-layers__focus[aria-current="true"] {
  background: #efe2a9;
  color: #57513d;
  font-weight: 600;
}

.canvas-layers__header button:hover,
.canvas-layers__focus:hover:not(:disabled),
.canvas-layers__visibility:hover {
  background: #f3eedf;
}

.canvas-layers__focus:disabled {
  color: #7a7c72;
  cursor: not-allowed;
}

.canvas-layers__visibility {
  color: #716849;
}

.canvas-layers__visibility[aria-pressed="false"] {
  color: #7a7c72;
}

.canvas-layers button:focus-visible {
  outline: 3px solid #817756;
  outline-offset: 1px;
}

@container personal-os (max-width: 767px) {
  .canvas-layers {
    top: 132px;
    left: 16px;
  }

  .canvas-layers__panel {
    width: min(280px, calc(var(--os-viewport-width, 100vw) - 32px));
    max-height: min(400px, calc(var(--os-viewport-height, 100dvh) - 340px));
  }
}

@container personal-os (max-height: 559px) and (orientation: landscape) {
  .canvas-layers__panel {
    position: fixed;
    top: 64px;
    bottom: 84px;
    left: 24px;
    width: min(280px, calc(var(--os-viewport-width, 100vw) - 32px));
    max-height: none;
  }

  .canvas-layers__header {
    min-height: 48px;
    padding: 0 8px 0 14px;
  }

  .canvas-layers__header span {
    display: none;
  }

  .canvas-layers__list {
    flex: 1;
  }
}

@container personal-os (min-width: 480px) and (max-width: 767px) and (max-height: 559px) and (orientation: landscape) {
  .canvas-layers__panel {
    top: 56px;
    left: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .canvas-layers,
  .canvas-layers :where(button) {
    transition: none !important;
  }
}
</style>
