<script setup>
import { markRaw, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import BottomOsNavigation from './BottomOsNavigation.vue'
import DesktopCanvas from './DesktopCanvas.vue'
import MacbookBoot from './MacbookBoot.vue'
import SystemTopBar from './SystemTopBar.vue'
import { hashForOsView, normalizeOsHash } from './personalOsRouter.mjs'

const activeView = ref('home')
const homeEntered = ref(false)
const hydrated = ref(false)
const bootDisabled = ref(typeof document !== 'undefined'
  && document.documentElement.dataset.personalSiteAccess === 'fallback')
const systemRequested = ref(false)
const systemError = ref(false)
const InfiniteCanvas = shallowRef(null)
const infiniteCanvasUrl = './InfiniteCanvas.vue'
let requestId = 0

async function requestSystem() {
  if (InfiniteCanvas.value) return
  const currentRequest = ++requestId
  systemRequested.value = true
  systemError.value = false
  try {
    const module = await import(/* @vite-ignore */ infiniteCanvasUrl)
    if (currentRequest === requestId) InfiniteCanvas.value = markRaw(module.default)
  } catch {
    if (currentRequest === requestId) systemError.value = true
  }
}

async function applyHash({ scroll = true } = {}) {
  const nextView = normalizeOsHash(window.location.hash)
  activeView.value = nextView
  if (nextView === 'system') void requestSystem()
  if (nextView === 'home') {
    if (!homeEntered.value) document.documentElement.dataset.personalSiteAccess = 'pending'
    if (!scroll || !homeEntered.value) return
    await nextTick()
    window.scrollTo(0, 0)
    return
  }
  document.documentElement.dataset.personalSiteAccess = 'entered'
  if (!scroll || nextView === 'system') return
  await nextTick()
  document.querySelector(`[data-os-view="${nextView}"]`)?.scrollIntoView({ block: 'start' })
}

function handleHashChange() {
  void applyHash()
}

function selectView(view) {
  const hash = hashForOsView(view)
  if (window.location.hash === hash) {
    void applyHash()
    return
  }
  window.location.hash = hashForOsView(view)
}

async function handleHomeEntered() {
  homeEntered.value = true
  await nextTick()
  if (activeView.value === 'home') window.scrollTo(0, 0)
}

function retrySystem() {
  InfiniteCanvas.value = null
  void requestSystem()
}

onMounted(() => {
  const accessState = document.documentElement.dataset.personalSiteAccess
  homeEntered.value = accessState === 'returning' || accessState === 'fallback'
  hydrated.value = true
  void applyHash({ scroll: false })
  window.addEventListener('hashchange', handleHashChange)
})

onBeforeUnmount(() => {
  requestId += 1
  window.removeEventListener('hashchange', handleHashChange)
})
</script>

<template>
  <MacbookBoot
    v-if="activeView === 'home'"
    :disabled="bootDisabled"
    @entered="handleHomeEntered"
  />
  <section v-show="!hydrated || (activeView === 'home' && homeEntered)" class="factory-home" data-os-view="home">
    <SystemTopBar />
    <DesktopCanvas />
  </section>
  <section v-show="activeView === 'knowledge'" class="knowledge-factory-page" data-os-view="knowledge">
    <h1>知识档案</h1>
    <p>个人知识视图正在装配。</p>
  </section>
  <section v-show="activeView === 'system'" class="personal-system-view" data-os-view="system">
    <Suspense v-if="systemRequested && InfiniteCanvas">
      <component :is="InfiniteCanvas" />
      <template #fallback><p>正在加载我的 OS…</p></template>
    </Suspense>
    <button v-else-if="systemError" type="button" @click="retrySystem">重新加载我的 OS</button>
    <p v-else>正在加载我的 OS…</p>
  </section>
  <BottomOsNavigation :active-view="activeView" @select="selectView" />
</template>
