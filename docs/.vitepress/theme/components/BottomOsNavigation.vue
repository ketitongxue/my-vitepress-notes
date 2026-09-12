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
      data-os-nav-target="system"
      :class="{ 'is-active': activeView === 'system' }"
      :aria-current="activeView === 'system' ? 'page' : undefined"
      @click="emit('select', 'system')"
    >
      02 我的 OS
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
  isolation: isolate;
  animation: os-dock-in 550ms cubic-bezier(.16, 1, .3, 1);
}

.bottom-os-navigation::before {
  position: absolute;
  z-index: -1;
  top: 5px;
  bottom: 5px;
  left: 5px;
  width: calc((100% - 14px) / 2);
  border: 1px solid rgb(38 101 164 / 24%);
  border-radius: inherit;
  background: #2f83d6;
  box-shadow: inset 0 1px rgb(255 255 255 / 26%);
  content: "";
  transition: transform 350ms cubic-bezier(.16, 1, .3, 1);
}

@keyframes os-dock-in {
  from { opacity: 0; transform: translate(50%, 16px); }
  to { opacity: 1; transform: translate(50%, 0); }
}

.bottom-os-navigation button {
  flex: 1 0 0;
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
  color: #fffdf7;
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
  .bottom-os-navigation::before,
  .bottom-os-navigation button {
    animation: none !important;
    transition: none !important;
  }
}
</style>
