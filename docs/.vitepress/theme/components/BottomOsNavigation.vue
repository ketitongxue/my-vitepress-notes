<script setup>
defineProps({ activeView: { type: String, required: true } })
const emit = defineEmits(['select'])
</script>

<template>
  <nav class="bottom-os-navigation" aria-label="个人系统视图">
    <button
      type="button"
      :class="{ 'is-active': activeView === 'home' }"
      :aria-current="activeView === 'home' ? 'page' : undefined"
      @click="emit('select', 'home')"
    >
      01 主页
    </button>
    <button
      type="button"
      :class="{ 'is-active': activeView === 'knowledge' }"
      :aria-current="activeView === 'knowledge' ? 'page' : undefined"
      @click="emit('select', 'knowledge')"
    >
      02 知识库
    </button>
    <button
      type="button"
      :class="{ 'is-active': activeView === 'system' }"
      :aria-current="activeView === 'system' ? 'page' : undefined"
      @click="emit('select', 'system')"
    >
      03 我的 OS
    </button>
  </nav>
</template>

<style scoped>
.bottom-os-navigation {
  position: fixed;
  z-index: 50;
  right: 50%;
  bottom: max(14px, env(safe-area-inset-bottom));
  display: flex;
  gap: 2px;
  padding: 4px;
  border: 1px solid rgb(30 36 48 / 28%);
  border-radius: 999px;
  background: #eef1f4;
  box-shadow: 0 4px 12px rgb(25 34 50 / 16%);
  transform: translateX(50%);
}

.bottom-os-navigation button {
  min-width: 92px;
  min-height: 44px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #1e2430;
  font: 11px/1 "JetBrains Mono", "Fira Code", Consolas, monospace;
  cursor: pointer;
}

.bottom-os-navigation button.is-active {
  border: 1px solid #1e2430;
  background: #2b7fd8;
  color: #fffdf7;
}

.bottom-os-navigation button:focus-visible {
  outline: 3px solid #1e2430;
  outline-offset: 2px;
}

@media (max-width: 767px) {
  .bottom-os-navigation {
    bottom: max(10px, env(safe-area-inset-bottom));
    max-width: calc(100vw - 24px);
  }

  .bottom-os-navigation button {
    min-width: 44px;
    min-height: 44px;
    padding: 0 12px;
    white-space: nowrap;
  }
}

@media (max-width: 359px) {
  .bottom-os-navigation button {
    padding: 0 8px;
    font-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bottom-os-navigation,
  .bottom-os-navigation button {
    transition: none !important;
  }
}
</style>
