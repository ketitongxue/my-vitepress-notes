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
      桌面
    </button>
    <button
      type="button"
      :class="{ 'is-active': activeView === 'knowledge' }"
      :aria-current="activeView === 'knowledge' ? 'page' : undefined"
      @click="emit('select', 'knowledge')"
    >
      知识
    </button>
    <button
      type="button"
      :class="{ 'is-active': activeView === 'system' }"
      :aria-current="activeView === 'system' ? 'page' : undefined"
      @click="emit('select', 'system')"
    >
      系统
    </button>
  </nav>
</template>

<style scoped>
.bottom-os-navigation {
  position: fixed;
  z-index: 50;
  right: 50%;
  bottom: 18px;
  display: flex;
  gap: 4px;
  padding: 6px;
  border: 1px solid #69707d;
  border-radius: 14px;
  background: #fffdf7;
  transform: translateX(50%);
}

.bottom-os-navigation button {
  min-width: 64px;
  min-height: 44px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #1e2430;
  font: inherit;
  cursor: pointer;
}

.bottom-os-navigation button.is-active {
  background: #315efb;
  color: #fffdf7;
}

.bottom-os-navigation button:focus-visible {
  outline: 2px solid #315efb;
  outline-offset: 2px;
}
</style>
