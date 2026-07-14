<script setup>
import { markRaw, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import BottomOsNavigation from './BottomOsNavigation.vue'
import DesktopSurface from './DesktopSurface.vue'
import KnowledgePortfolio from './KnowledgePortfolio.vue'
import MacbookBoot from './MacbookBoot.vue'
import MacbookExit from './MacbookExit.vue'
import {
  hasCompletedHomeEntry, hashForOsView, initialOsView, normalizeOsHash,
} from './personalOsRouter.mjs'
import { loadSystemCanvasModule } from './systemCanvasLoader.mjs'

const SYSTEM_ACTIVE_CLASS = 'personal-os-system-active'
const claimedView = typeof document === 'undefined'
  ? 'home'
  : document.documentElement.dataset.personalOsView
const activeView = ref(initialOsView(claimedView))
const homeEntered = ref(false)
const hydrated = ref(false)
const bootDisabled = ref(typeof document !== 'undefined'
  && document.documentElement.dataset.personalSiteAccess === 'fallback')
const systemLoadState = ref('idle')
const InfiniteCanvas = shallowRef(null)
const systemImporters = Object.freeze({
  initial: () => import('./InfiniteCanvas.vue'),
  retry: () => import('./InfiniteCanvas.vue?retry=1'),
})
let systemImportAttempt = 0
let requestId = 0

function setSystemChromeIsolation(active) {
  if (typeof document === 'undefined') return
  const targets = [
    document.documentElement,
    document.body,
    document.querySelector('.Layout'),
  ]
  for (const target of targets) target?.classList.toggle(SYSTEM_ACTIVE_CLASS, active)
}

async function requestSystem() {
  if (systemLoadState.value === 'loading' || InfiniteCanvas.value) return
  const currentRequest = ++requestId
  systemLoadState.value = 'loading'
  try {
    const module = await loadSystemCanvasModule(systemImportAttempt, systemImporters)
    if (currentRequest !== requestId) return
    InfiniteCanvas.value = markRaw(module.default)
    systemLoadState.value = 'loaded'
  } catch {
    if (currentRequest !== requestId) return
    systemLoadState.value = 'error'
  }
}

async function resetViewScroll(view) {
  await nextTick()
  if (view === 'knowledge') {
    document.getElementById('personal-os-knowledge')?.scrollIntoView({ block: 'start' })
    return
  }
  window.scrollTo(0, 0)
}

async function applyHash({ scroll = true } = {}) {
  const nextView = normalizeOsHash(window.location.hash)
  activeView.value = nextView
  document.documentElement.dataset.personalOsView = nextView
  setSystemChromeIsolation(nextView === 'system')

  if (nextView === 'system') void requestSystem()
  if (nextView === 'home' && !homeEntered.value) {
    document.documentElement.dataset.personalSiteAccess = 'pending'
  } else {
    document.documentElement.dataset.personalSiteAccess = 'entered'
  }

  if (!scroll || (nextView === 'home' && !homeEntered.value)) return
  await resetViewScroll(nextView)
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
  if (homeEntered.value) return
  homeEntered.value = true
  await nextTick()
  if (activeView.value !== 'home') return
  window.scrollTo(0, 0)
  document.getElementById('personal-os-home')?.focus({ preventScroll: true })
}

function retrySystem() {
  if (systemLoadState.value === 'loading') return
  InfiniteCanvas.value = null
  systemImportAttempt = 1
  void requestSystem()
}

onMounted(() => {
  const accessState = document.documentElement.dataset.personalSiteAccess
  homeEntered.value = hasCompletedHomeEntry(accessState)
  hydrated.value = true
  void applyHash({ scroll: false })
  window.addEventListener('hashchange', handleHashChange)
})

onBeforeUnmount(() => {
  requestId += 1
  setSystemChromeIsolation(false)
  window.removeEventListener('hashchange', handleHashChange)
})
</script>

<template>
  <MacbookBoot
    v-if="!hydrated || (activeView === 'home' && !homeEntered)"
    :active="activeView === 'home'"
    :disabled="bootDisabled"
    @entered="handleHomeEntered"
  />
  <div class="factory-home">
    <main
      v-show="!hydrated || (activeView === 'home' && homeEntered)"
      id="personal-os-home"
      tabindex="-1"
      aria-label="JuZX OS 主页"
      data-os-view="home"
    >
      <DesktopSurface />
      <MacbookExit />
    </main>
    <section
      v-show="!hydrated || activeView === 'knowledge'"
      id="personal-os-knowledge"
      class="knowledge-factory-page"
      aria-label="知识库视图"
      data-os-view="knowledge"
    >
      <KnowledgePortfolio />
    </section>
    <section
      v-show="!hydrated || activeView === 'system'"
      class="personal-system-view"
      aria-label="我的 OS 系统视图"
      data-os-view="system"
    >
      <component v-if="InfiniteCanvas" :is="InfiniteCanvas" />
      <div
        v-else-if="systemLoadState === 'loading'"
        class="personal-system-view__status"
        role="status"
      >
        正在加载我的 OS…
      </div>
      <div
        v-else-if="systemLoadState === 'error'"
        class="personal-system-view__error"
        role="alert"
      >
        <strong>我的 OS 暂时无法加载</strong>
        <p>其他页面仍可正常使用，你可以重新请求画布模块。</p>
        <button type="button" @click="retrySystem">重新加载我的 OS</button>
      </div>
      <div v-else class="personal-system-view__status" role="status">
        准备加载我的 OS…
      </div>
    </section>
    <BottomOsNavigation
      v-show="!hydrated || activeView !== 'home' || homeEntered"
      :active-view="activeView"
      @select="selectView"
    />
  </div>
</template>
