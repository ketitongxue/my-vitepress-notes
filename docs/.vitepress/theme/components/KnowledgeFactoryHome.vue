<script setup>
import { markRaw, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import BottomOsNavigation from './BottomOsNavigation.vue'
import DesktopSurface from './DesktopSurface.vue'
import KnowledgePortfolio from './KnowledgePortfolio.vue'
import MacbookBoot from './MacbookBoot.vue'
import MacbookExit from './MacbookExit.vue'
import { hashForOsView, normalizeOsHash } from './personalOsRouter.mjs'
import { loadSystemCanvasModule } from './systemCanvasLoader.mjs'

const activeView = ref('home')
const homeEntered = ref(false)
const hydrated = ref(false)
const bootDisabled = ref(typeof document !== 'undefined'
  && (document.documentElement.dataset.personalSiteAccess === 'fallback'
    || document.documentElement.dataset.personalOsView === 'knowledge'
    || document.documentElement.dataset.personalOsView === 'system'))
const systemLoadState = ref('idle')
const InfiniteCanvas = shallowRef(null)
const systemImporters = Object.freeze({
  initial: () => import('./InfiniteCanvas.vue'),
  retry: () => import('./InfiniteCanvas.vue?retry=1'),
})
let systemImportAttempt = 0
let requestId = 0

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
  const claimedView = document.documentElement.dataset.personalOsView
  homeEntered.value = accessState === 'returning'
    || accessState === 'fallback'
    || claimedView === 'knowledge'
    || claimedView === 'system'
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
    v-if="!hydrated || (activeView === 'home' && !homeEntered)"
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
      <p v-else-if="systemLoadState === 'loading'" role="status">正在加载我的 OS…</p>
      <button
        v-else-if="systemLoadState === 'error'"
        type="button"
        @click="retrySystem"
      >
        重新加载我的 OS
      </button>
      <p v-else role="status">准备加载我的 OS…</p>
    </section>
    <BottomOsNavigation
      v-show="hydrated && (activeView !== 'home' || homeEntered)"
      :active-view="activeView"
      @select="selectView"
    />
  </div>
</template>
