<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { getLibraryDirectoryView, loadLibraryDocuments, libraryUrl, observeEmbeddedFrameFocus } from './knowledgeLibrary.mjs'

const emit = defineEmits(['activate'])
const groups = ref([])
const loading = ref(true)
const failed = ref(false)
const usingSnapshot = ref(false)
const selectedCategory = ref(null)
const collapsedCategories = ref(new Set())
const directoryId = useId()
const total = computed(() => groups.value.reduce((count, group) => count + group.articles.length, 0))
const directoryView = computed(() => getLibraryDirectoryView(groups.value, selectedCategory.value))
const directory = ref(null)
const directoryHeading = ref(null)
const readerHeading = ref(null)
const readerFrame = ref(null)
const selectedArticle = ref(null)
const readerVersion = ref(0)
const readerLoading = ref(false)
const readerNotice = ref('')
let controller
let timer
let readerTimer
let returnTarget
let stopFocusObserver
let directoryScrollTop = 0
let disposed = false

async function load() {
  controller?.abort()
  clearTimeout(timer)
  controller = new AbortController()
  const request = controller
  loading.value = true
  failed.value = false
  timer = setTimeout(() => request.abort(), 15000)
  try {
    const result = await loadLibraryDocuments({ signal: request.signal })
    if (!disposed && request === controller) {
      groups.value = result.groups
      selectedCategory.value = getLibraryDirectoryView(result.groups, selectedCategory.value).selectedCategory
      const currentCategories = new Set(result.groups.map((group) => group.title))
      collapsedCategories.value = new Set([...collapsedCategories.value].filter((title) => currentCategories.has(title)))
      usingSnapshot.value = result.usingSnapshot
    }
  } catch {
    if (!disposed && request === controller) failed.value = true
  } finally {
    if (!disposed && request === controller) {
      clearTimeout(timer)
      loading.value = false
    }
  }
}

function groupPanelId(title) {
  return `${directoryId}-category-${encodeURIComponent(title)}`
}

function toggleCategory(title) {
  if (collapsedCategories.value.has(title)) collapsedCategories.value.delete(title)
  else collapsedCategories.value.add(title)
}

function startReaderAttempt() {
  clearTimeout(readerTimer)
  readerLoading.value = true
  readerNotice.value = ''
  readerVersion.value += 1
  readerTimer = setTimeout(() => {
    readerLoading.value = false
    readerNotice.value = '加载时间较长。如果内容没有显示，可以重新加载。'
  }, 15000)
}

async function openArticle(article, event) {
  returnTarget = event?.currentTarget
  directoryScrollTop = directory.value?.scrollTop ?? 0
  selectedArticle.value = article
  startReaderAttempt()
  await nextTick()
  if (!disposed) readerHeading.value?.focus({ preventScroll: true })
}

function openFullLibrary(event) {
  return openArticle({ title: '完整知识库', href: libraryUrl }, event)
}

function finishReaderAttempt(event) {
  if (event.currentTarget !== readerFrame.value) return
  clearTimeout(readerTimer)
  readerLoading.value = false
  // Cross-origin iframe load events cannot verify the response status or content.
  readerNotice.value = event.type === 'error' ? '内容暂时无法显示，可以重新加载。' : ''
}

async function returnToDirectory() {
  clearTimeout(readerTimer)
  selectedArticle.value = null
  readerLoading.value = false
  readerNotice.value = ''
  await nextTick()
  if (disposed) return
  if (directory.value) directory.value.scrollTop = directoryScrollTop
  const target = returnTarget?.isConnected ? returnTarget : directoryHeading.value
  target?.focus({ preventScroll: true })
}

onMounted(() => {
  void load()
  stopFocusObserver = observeEmbeddedFrameFocus({
    windowLike: window,
    getFrame: () => readerFrame.value,
    activate: () => emit('activate'),
  })
})
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(timer)
  clearTimeout(readerTimer)
  controller?.abort()
  stopFocusObserver?.()
})
</script>

<template>
  <section class="knowledge-library" aria-label="知识库">
    <div v-show="!selectedArticle" ref="directory" class="knowledge-library__directory" :aria-busy="loading">
      <p ref="directoryHeading" class="knowledge-library__intro" tabindex="-1">AI 学习与实践，按主题浏览。</p>
      <p v-if="loading" role="status">正在加载文章目录…</p>
      <div v-else-if="failed" role="status">
        <p>暂时无法加载目录，请重试或在窗口内打开完整知识库。</p>
        <button type="button" @click="load">重新加载目录</button>
      </div>
      <p v-else-if="!total">知识库暂时没有已发布的 HTML 文章。</p>
      <template v-else>
        <p class="knowledge-library__count">{{ groups.length }} 个分类 · {{ total }} 篇文章</p>
        <p v-if="usingSnapshot" class="knowledge-library__snapshot" role="status">已显示可用目录，最新文章可能稍后更新。<button type="button" @click="load">刷新目录</button></p>
        <div class="knowledge-library__filters" role="group" aria-label="按文章分类筛选">
          <button type="button" class="knowledge-library__filter" :aria-pressed="selectedCategory === null" @click="selectedCategory = null">
            <span>全部</span><span class="knowledge-library__filter-count">{{ total }}</span>
          </button>
          <button
            v-for="group in groups"
            :key="group.title"
            type="button"
            class="knowledge-library__filter"
            :aria-pressed="selectedCategory === group.title"
            @click="selectedCategory = group.title"
          >
            <span>{{ group.title }}</span><span class="knowledge-library__filter-count">{{ group.articles.length }}</span>
          </button>
        </div>
        <p class="knowledge-library__result" role="status" aria-live="polite" aria-atomic="true">
          {{ directoryView.selectedCategory ?? '全部分类' }} · {{ directoryView.total }} 篇文章
        </p>
        <section v-for="group in directoryView.groups" :key="group.title" class="knowledge-library__group">
          <h3>
            <button
              type="button"
              class="knowledge-library__group-toggle"
              :aria-expanded="!collapsedCategories.has(group.title)"
              :aria-controls="groupPanelId(group.title)"
              @click="toggleCategory(group.title)"
            >
              <span class="knowledge-library__group-title">{{ group.title }}</span>
              <span class="knowledge-library__group-count">{{ group.articles.length }} 篇</span>
              <span class="knowledge-library__chevron" aria-hidden="true">{{ collapsedCategories.has(group.title) ? '+' : '−' }}</span>
            </button>
          </h3>
          <ul :id="groupPanelId(group.title)" v-show="!collapsedCategories.has(group.title)">
            <li v-for="article in group.articles" :key="article.href">
              <button type="button" class="knowledge-library__article" @click="openArticle(article, $event)">{{ article.title }}</button>
            </li>
          </ul>
        </section>
      </template>
      <footer><button type="button" @click="openFullLibrary">浏览完整知识库 →</button></footer>
    </div>
    <div v-if="selectedArticle" class="knowledge-library__reader">
      <header class="knowledge-library__reader-toolbar">
        <button type="button" @click="returnToDirectory">← 返回目录</button>
        <h2 ref="readerHeading" tabindex="-1">{{ selectedArticle.title }}</h2>
        <button type="button" @click="startReaderAttempt">重新加载</button>
      </header>
      <p v-if="readerLoading" class="knowledge-library__reader-status" role="status">正在加载内容…</p>
      <p v-else-if="readerNotice" class="knowledge-library__reader-status" role="status">{{ readerNotice }}</p>
      <iframe
        :key="readerVersion"
        ref="readerFrame"
        class="knowledge-library__frame"
        :src="selectedArticle.href"
        :title="`${selectedArticle.title} · 知识库阅读内容`"
        sandbox="allow-scripts allow-same-origin allow-downloads"
        referrerpolicy="no-referrer"
        @load="finishReaderAttempt"
        @error="finishReaderAttempt"
      ></iframe>
    </div>
  </section>
</template>

<style scoped>
.knowledge-library { display: flex; flex: 1; min-width: 0; min-height: 0; overflow: hidden; overflow-wrap: anywhere; font-size: 14px; }
.knowledge-library__directory { flex: 1; min-width: 0; min-height: 0; overflow: auto; padding: 20px 24px; }
.knowledge-library__intro { color: #485465; }
.knowledge-library__count { color: #69717e; font-size: 12px; }
.knowledge-library__snapshot { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: #69717e; font-size: 12px; }
.knowledge-library__filters { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; margin-top: 18px; }
.knowledge-library__result { margin: 12px 0 0; color: #485465; font-size: 12px; }
.knowledge-library__group { margin: 16px 0; }
.knowledge-library__group h3 { margin: 0 0 8px; color: #285a87; font-size: 15px; }
.knowledge-library ul { list-style: none; padding: 0; margin: 0; }
.knowledge-library li + li { margin-top: 6px; }
.knowledge-library button { padding: 6px 12px; border: 1px solid #89abd0; border-radius: 6px; background: #fffdf7; color: #285a87; cursor: pointer; font: inherit; }
.knowledge-library button.knowledge-library__article { display: block; width: 100%; padding: 8px 10px; border-color: #d9e3ed; border-radius: 8px; text-align: left; line-height: 1.6; }
.knowledge-library button:hover { background: #edf3fa; border-color: #89abd0; }
.knowledge-library button:focus-visible { outline: 2px solid #315efb; outline-offset: 3px; }
.knowledge-library button.knowledge-library__filter { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; min-height: 36px; padding: 6px 12px; border-color: #c8d9e8; border-radius: 18px; text-align: left; font-size: 12px; line-height: 1.5; }
.knowledge-library button.knowledge-library__filter[aria-pressed="true"] { border-color: #285a87; background: #285a87; color: #fffdf7; }
.knowledge-library button.knowledge-library__filter[aria-pressed="true"]:hover { background: #204b72; }
.knowledge-library__filter-count { flex-shrink: 0; min-width: 20px; padding: 0 5px; border-radius: 10px; background: #edf3fa; color: #285a87; text-align: center; font-size: 11px; }
.knowledge-library button.knowledge-library__group-toggle { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 44px; padding: 8px 10px; border-color: #d9e3ed; background: #f3f6fa; text-align: left; }
.knowledge-library button.knowledge-library__group-toggle:hover { border-color: #89abd0; background: #edf3fa; }
.knowledge-library__group-title { flex: 1; min-width: 0; }
.knowledge-library__group-count { flex-shrink: 0; color: #69717e; font-size: 11px; font-weight: normal; }
.knowledge-library__chevron { flex-shrink: 0; width: 18px; text-align: center; font-size: 18px; font-weight: normal; }
.knowledge-library footer { margin-top: 20px; padding-top: 12px; border-top: 1px dashed #c8d9e8; }
.knowledge-library__reader { display: flex; flex: 1; flex-direction: column; min-width: 0; min-height: 0; }
.knowledge-library__reader-toolbar { display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #d9e3ed; background: #fffdf7; }
.knowledge-library__reader-toolbar h2 { flex: 1; min-width: 0; margin: 0; font-size: 14px; line-height: 1.5; }
.knowledge-library__reader-toolbar button { flex-shrink: 0; }
.knowledge-library__reader-status { margin: 0; padding: 8px 12px; background: #edf3fa; color: #485465; font-size: 12px; }
.knowledge-library__frame { display: block; flex: 1; width: 100%; min-height: 0; border: 0; background: #fff; }
@media (max-width: 600px) {
  .knowledge-library__directory { padding: 16px; }
  .knowledge-library__reader-toolbar { flex-wrap: wrap; gap: 8px; padding: 10px; }
  .knowledge-library__reader-toolbar h2 { order: -1; flex-basis: 100%; }
}
</style>
