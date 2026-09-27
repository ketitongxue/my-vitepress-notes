<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vitepress'
import { IconMessageCircle } from '@tabler/icons-vue'
import { crispConfig } from '../crispConfig.mjs'
import { createCrispChatClient, isAdminPath, isCrispConfigured } from './crispChatClient.mjs'
import { observeVisualViewport } from './visualViewport.mjs'

const route = useRoute()
const mounted = ref(false)
const bootPending = ref(true)
const loading = ref(false)
const failed = ref(false)
const opened = ref(false)
const unread = ref(0)
const launcher = ref(null)
const viewportStyle = shallowRef({})
const isHome = computed(() => /^\/(?:index\.html)?$/.test(route.path))
const eligible = computed(() => mounted.value && isCrispConfigured(crispConfig)
  && !isAdminPath(route.path) && (!isHome.value || !bootPending.value))
let client
let observer
let stopObservingViewport

function syncBoot() {
  bootPending.value = ['pending', 'returning'].includes(document.documentElement.dataset.personalSiteAccess)
}

async function openChat() {
  if (!eligible.value || loading.value) return
  loading.value = true
  try {
    await client.open()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

function reloadPage() {
  window.location.reload()
}

watch(() => route.path, () => { if (mounted.value) syncBoot() })

onMounted(() => {
  mounted.value = window.self === window.top
  if (!mounted.value || !isCrispConfigured(crispConfig) || isAdminPath(window.location.href)) return
  syncBoot()
  observer = new MutationObserver(syncBoot)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-personal-site-access'] })
  stopObservingViewport = observeVisualViewport(window, (style) => { viewportStyle.value = style })
  client = createCrispChatClient({
    config: crispConfig,
    isAllowed: () => eligible.value && !isAdminPath(window.location.href),
    onChange(state) {
      if (state.unread !== undefined) unread.value = state.unread
      if (state.opened !== undefined) {
        opened.value = state.opened
        if (!state.opened) void nextTick(() => launcher.value?.focus({ preventScroll: true }))
      }
    },
  })
})

onBeforeUnmount(() => {
  mounted.value = false
  observer?.disconnect()
  stopObservingViewport?.()
  client?.dispose()
})
</script>

<template>
  <Teleport to="body">
    <aside v-if="eligible && !opened" class="crisp-contact" :class="{ 'crisp-contact--home': isHome }" :style="viewportStyle" aria-label="联系站长">
      <div v-if="failed" class="crisp-contact__error" role="status">
        <p>聊天暂时无法连接，请刷新页面后重试。</p>
        <button type="button" @click="reloadPage">刷新页面</button>
      </div>
      <button v-else ref="launcher" type="button" class="crisp-contact__button" :disabled="loading" :aria-busy="loading" :aria-label="unread ? `联系我，${unread} 条未读消息` : '联系我'" @click="openChat">
        <IconMessageCircle :size="20" :stroke-width="1.8" aria-hidden="true" />
        <span aria-live="polite">{{ loading ? '连接中…' : '联系我' }}</span>
        <span v-if="unread" class="crisp-contact__unread" aria-hidden="true">{{ unread > 9 ? '9+' : unread }}</span>
      </button>
    </aside>
  </Teleport>
</template>

<style scoped>
.crisp-contact {
  position: fixed;
  z-index: 80;
  left: calc(var(--os-viewport-left, 0px) + var(--os-viewport-width, 100vw) - max(16px, env(safe-area-inset-right)));
  top: calc(var(--os-viewport-top, 0px) + var(--os-viewport-height, 100dvh) - max(24px, env(safe-area-inset-bottom)));
  transform: translate(-100%, -100%);
  max-width: calc(var(--os-viewport-width, 100vw) - 32px);
  color: #1e2430;
  font-family: var(--vp-font-family-base);
}

.crisp-contact--home {
  top: calc(var(--os-viewport-top, 0px) + var(--os-viewport-height, 100dvh) - max(148px, calc(env(safe-area-inset-bottom) + 140px)));
}

@media (max-width: 767px) and (max-height: 720px) {
  .crisp-contact--home {
    left: calc(var(--os-viewport-left, 0px) + max(16px, env(safe-area-inset-left)));
    transform: translateY(-100%);
  }
}

.crisp-contact__button {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid rgb(38 101 164 / 24%);
  border-radius: 999px;
  background: #fffdf6;
  box-shadow: 0 4px 16px rgb(25 70 115 / 16%);
  color: #1e2430;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.crisp-contact__button:hover { background: #eef5ff; }
.crisp-contact__button:disabled { cursor: wait; }
.crisp-contact button:focus-visible { outline: 3px solid #275dad; outline-offset: 3px; }
.crisp-contact__unread { color: #fffdf6; background: #275dad; border-radius: 12px; padding: 0 6px; }
.crisp-contact__error { width: 250px; max-width: 100%; padding: 14px; border-radius: 12px; background: #fffdf6; box-shadow: 0 4px 16px rgb(25 70 115 / 16%); font-size: 14px; }
.crisp-contact__error p { margin: 0 0 8px; }
.crisp-contact__error button { min-height: 44px; color: #275dad; text-decoration: underline; }
</style>
