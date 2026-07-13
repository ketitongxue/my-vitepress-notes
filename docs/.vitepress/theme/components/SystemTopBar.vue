<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { formatLocalTime, startLocalClock } from './SystemTopBar.mjs'

const clockTime = ref('--:--')
let stopClock = () => {}

function updateClock() {
  clockTime.value = formatLocalTime(new Date())
}

onMounted(() => {
  stopClock = startLocalClock(updateClock, window.setInterval, window.clearInterval)
})

onBeforeUnmount(() => {
  stopClock()
})
</script>

<template>
  <header class="system-topbar">
    <span class="system-topbar__brand">JuZX OS</span>
    <nav class="system-topbar__navigation" aria-label="Personal OS navigation">
      <a href="/">01 HOME</a>
      <a href="#projects">02 PROJECTS</a>
      <a href="#notes">03 NOTES</a>
      <a href="/about">04 ABOUT</a>
    </nav>
    <p class="system-topbar__state">
      <span class="system-topbar__status-dot" aria-hidden="true" />
      <span>SYSTEM ONLINE</span>
      <span>v1.0</span>
      <time :datetime="clockTime" aria-live="off">{{ clockTime }}</time>
    </p>
  </header>
</template>
