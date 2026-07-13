<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  beginAccess, getReducedMotionPreference, getSessionStorage, isInteractiveTarget, readInitialBootState,
  shouldActivateFromEnter, shouldContainTab, transitionBoot,
} from './factoryBootState.mjs'

const emit = defineEmits(['reveal'])
const accessButton = ref(null)
const visible = ref(true)
const state = ref('complete')
let exitTimer

function clearPreflightFallback() {
  const timer = window['__personalSiteAccessFallback']
  if (timer !== undefined) window.clearTimeout(timer)
  delete window['__personalSiteAccessFallback']
}

function removeKeydown() {
  window.removeEventListener('keydown', handleKeydown)
}

async function finishExit() {
  if (state.value !== 'leaving') return
  state.value = transitionBoot(state.value, 'EXIT_COMPLETE')
  visible.value = false
  document.documentElement.dataset.personalSiteAccess = 'entered'
  emit('reveal')
  await nextTick()
  removeKeydown()
  document.getElementById('factory-title')?.focus({ preventScroll: true })
}

async function failOpen() {
  clearPreflightFallback()
  document.documentElement.dataset.personalSiteAccess = 'fallback'
  visible.value = false
  await nextTick()
  removeKeydown()
  document.getElementById('factory-title')?.focus({ preventScroll: true })
}

function activate() {
  if (state.value !== 'ready') return
  const nextState = beginAccess(state.value, getSessionStorage(window))
  state.value = nextState
  if (nextState === 'skipped') {
    void failOpen()
    return
  }
  document.documentElement.dataset.personalSiteAccess = 'leaving'
  exitTimer = window.setTimeout(finishExit, 400)
}

function handleOverlayClick(event) {
  if (!isInteractiveTarget(event.target)) activate()
}

function handleKeydown(event) {
  if (shouldContainTab(event, state.value)) {
    event.preventDefault()
    accessButton.value?.focus({ preventScroll: true })
    return
  }
  if (state.value !== 'ready') return
  if (shouldActivateFromEnter(event, state.value)) activate()
}

onMounted(async () => {
  const root = document.documentElement
  const initial = readInitialBootState(
    getSessionStorage(window),
    getReducedMotionPreference(window),
    root.dataset.personalSiteAccess ?? 'none',
  )
  clearPreflightFallback()
  if (initial !== 'ready') {
    state.value = transitionBoot('ready', 'BYPASS')
    visible.value = false
    root.dataset.personalSiteAccess = 'returning'
    return
  }
  state.value = 'ready'
  window.addEventListener('keydown', handleKeydown)
  await nextTick()
  accessButton.value?.focus({ preventScroll: true })
})

onBeforeUnmount(() => {
  if (exitTimer !== undefined) window.clearTimeout(exitTimer)
  removeKeydown()
  clearPreflightFallback()
  const root = document.documentElement
  if (root.dataset.personalSiteAccess === 'pending' || root.dataset.personalSiteAccess === 'leaving') {
    root.dataset.personalSiteAccess = 'fallback'
  }
})
</script>

<template>
  <section
    v-if="visible"
    class="factory-boot"
    :data-state="state"
    aria-label="个人网站启动页"
    @click="handleOverlayClick"
  >
    <p class="factory-boot__shell" aria-hidden="true">JuZX@digital-factory ~ zsh</p>
    <button
      ref="accessButton"
      class="factory-boot__access"
      type="button"
      aria-label="进入个人网站"
      :aria-disabled="state === 'leaving'"
      @click.stop="activate"
    >
      <span class="factory-boot__command" aria-hidden="true">> Press Enter to Access System</span>
      <span class="factory-boot__cursor" aria-hidden="true">_</span>
    </button>
  </section>
</template>
