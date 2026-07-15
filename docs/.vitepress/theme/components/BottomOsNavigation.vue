<script setup>
defineProps({ activeView: { type: String, required: true } })
const emit = defineEmits(['select'])
</script>

<template>
  <nav class="bottom-os-navigation" aria-label="个人系统视图">
    <button
      type="button"
      data-os-nav-target="home"
      :class="{ 'is-active': activeView === 'home' }"
      :aria-current="activeView === 'home' ? 'page' : undefined"
      @click="emit('select', 'home')"
    >
      01 主页
    </button>
    <button
      type="button"
      data-os-nav-target="knowledge"
      :class="{ 'is-active': activeView === 'knowledge' }"
      :aria-current="activeView === 'knowledge' ? 'page' : undefined"
      @click="emit('select', 'knowledge')"
    >
      02 知识库
    </button>
    <button
      type="button"
      data-os-nav-target="system"
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
  gap: 4px;
  padding: 5px;
  border: 1px solid rgb(255 255 255 / 62%);
  border-radius: 999px;
  background: rgb(255 253 246 / 92%);
  box-shadow: 0 8px 24px rgb(25 70 115 / 22%);
  transform: translateX(50%);
  backdrop-filter: blur(12px);
}

.bottom-os-navigation button {
  min-width: 92px;
  min-height: 44px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #33445d;
  font: 11px/1 "JetBrains Mono", "Fira Code", Consolas, monospace;
  cursor: pointer;
  transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
}

.bottom-os-navigation button.is-active {
  border: 1px solid rgb(38 101 164 / 24%);
  background: #2f83d6;
  color: #fffdf7;
  box-shadow: inset 0 1px rgb(255 255 255 / 26%);
}

.bottom-os-navigation button:hover:not(.is-active) {
  background: rgb(47 131 214 / 10%);
}

.bottom-os-navigation button:active {
  transform: scale(.97);
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
