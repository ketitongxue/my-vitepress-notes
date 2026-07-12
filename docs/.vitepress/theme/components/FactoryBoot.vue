<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  getSessionStorage, isInteractiveTarget, readInitialBootState, shouldStartFromEnter,
  transitionBoot, writeBooted,
} from './factoryBootState.mjs'

const state = ref('ready')
const visibleLines = ref([])
const timers = new Set()
const lines = ['Loading knowledge archives', 'Connecting Ask Console']
const statusText = computed(() => ({
  ready: '知识系统可以启动，页面内容已可访问。',
  booting: '正在准备知识系统。',
  complete: 'SYSTEM READY',
  skipped: 'SYSTEM READY',
})[state.value])

function schedule(callback, delay) {
  const timer = window.setTimeout(() => {
    timers.delete(timer)
    callback()
  }, delay)
  timers.add(timer)
}

function clearTimers() {
  for (const timer of timers) window.clearTimeout(timer)
  timers.clear()
}

function finish() {
  state.value = transitionBoot(state.value, 'COMPLETE')
  writeBooted(getSessionStorage(window))
}

function start() {
  if (state.value !== 'ready') return
  state.value = transitionBoot(state.value, 'START')
  schedule(() => visibleLines.value.push(lines[0]), 320)
  schedule(() => visibleLines.value.push(lines[1]), 720)
  schedule(finish, 900)
}

function skip() {
  clearTimers()
  state.value = transitionBoot(state.value, 'SKIP')
  writeBooted(getSessionStorage(window))
}

function handleKeydown(event) {
  if (shouldStartFromEnter(event, state.value)) start()
}

function handlePanelClick(event) {
  if (state.value === 'ready' && !isInteractiveTarget(event.target)) start()
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  state.value = readInitialBootState(getSessionStorage(window), reduced)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  clearTimers()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="factory-boot" :data-state="state" @click="handlePanelClick">
    <div class="factory-boot__lines" aria-hidden="true">
      <p v-for="line in visibleLines" :key="line">$ {{ line }}</p>
    </div>
    <p class="factory-boot__status" aria-live="polite">{{ statusText }}</p>
    <div v-if="state === 'ready' || state === 'booting'" class="factory-boot__controls">
      <button type="button" :disabled="state === 'booting'" @click.stop="start">启动知识系统</button>
      <button type="button" class="quiet" @click.stop="skip">跳过启动</button>
    </div>
  </div>
</template>
