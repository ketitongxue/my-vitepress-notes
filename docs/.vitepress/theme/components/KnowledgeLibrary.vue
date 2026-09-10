<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { groupLibraryDocuments, libraryTreeUrl, libraryUrl } from './knowledgeLibrary.mjs'

const groups = ref([])
const loading = ref(true)
const failed = ref(false)
const total = computed(() => groups.value.reduce((count, group) => count + group.articles.length, 0))
let controller
let timer
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
    const response = await fetch(libraryTreeUrl, { signal: request.signal })
    if (!response.ok) throw new Error('Library unavailable')
    const result = groupLibraryDocuments(await response.json())
    if (!disposed && request === controller) groups.value = result
  } catch {
    if (!disposed && request === controller) failed.value = true
  } finally {
    if (!disposed && request === controller) {
      clearTimeout(timer)
      loading.value = false
    }
  }
}

onMounted(load)
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(timer)
  controller?.abort()
})
</script>

<template>
  <section class="knowledge-library" aria-label="知识库分类文章" :aria-busy="loading">
    <p class="knowledge-library__intro">AI 学习与实践，按主题浏览。</p>
    <p v-if="loading" role="status">正在加载文章目录…</p>
    <div v-else-if="failed" role="status">
      <p>暂时无法加载目录，请重试或打开完整知识库。</p>
      <button type="button" @click="load">重新加载</button>
    </div>
    <p v-else-if="!total">知识库暂时没有已发布的 HTML 文章。</p>
    <template v-else>
      <p class="knowledge-library__count">{{ groups.length }} 个分类 · {{ total }} 篇文章</p>
      <section v-for="group in groups" :key="group.title" class="knowledge-library__group">
        <h3>{{ group.title }} <span>{{ group.articles.length }}</span></h3>
        <ul>
          <li v-for="article in group.articles" :key="article.href">
            <a :href="article.href" target="_blank" rel="noopener noreferrer">{{ article.title }}<span aria-hidden="true"> ↗</span></a>
          </li>
        </ul>
      </section>
    </template>
    <footer><a :href="libraryUrl" target="_blank" rel="noopener noreferrer">打开完整知识库 →</a></footer>
  </section>
</template>

<style scoped>
.knowledge-library { min-width: 0; overflow-wrap: anywhere; font-size: 14px; }
.knowledge-library__intro { color: #485465; }
.knowledge-library__count { color: #69717e; font-size: 12px; }
.knowledge-library__group { margin: 20px 0; }
.knowledge-library__group h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; color: #285a87; font-size: 15px; }
.knowledge-library__group h3 span { padding: 0 7px; border-radius: 10px; background: #edf3fa; font-size: 11px; font-weight: normal; }
.knowledge-library ul { list-style: none; padding: 0; margin: 0; }
.knowledge-library li + li { margin-top: 6px; }
.knowledge-library li a { display: block; padding: 8px 10px; border: 1px solid #d9e3ed; border-radius: 8px; background: #fffdf7; text-decoration: none; line-height: 1.6; }
.knowledge-library li a:hover { background: #edf3fa; border-color: #89abd0; }
.knowledge-library a:focus-visible, .knowledge-library button:focus-visible { outline: 2px solid #315efb; outline-offset: 3px; }
.knowledge-library button { padding: 6px 12px; border: 1px solid #89abd0; border-radius: 6px; color: #285a87; cursor: pointer; }
.knowledge-library footer { margin-top: 20px; padding-top: 12px; border-top: 1px dashed #c8d9e8; }
</style>
