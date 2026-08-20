<script setup>
import MarkdownIt from 'markdown-it'
import { computed, onMounted, ref } from 'vue'

const documents = ref([])
const selected = ref(null)
const loading = ref(true)
const uploading = ref(false)
const error = ref('')
const message = ref('')
const dragging = ref(false)
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: false })

function normalizeAssetPath(value) {
  if (typeof value !== 'string' || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return null
  let path
  try {
    path = decodeURIComponent(value.split(/[?#]/, 1)[0]).replaceAll('\\', '/').replace(/^\.\//, '')
  } catch {
    return null
  }
  const parts = path.split('/')
  if (!path || parts.some((part) => !part || part === '.' || part === '..')) return null
  return parts.join('/')
}

function assetUrl(value) {
  const path = normalizeAssetPath(value)
  if (!path || !selected.value?.id) return value
  const asset = selected.value.assets?.find(({ path: assetPath }) => assetPath === path)
  if (!asset) return value
  return `/api/admin/private-notes/${selected.value.id}/assets/${path.split('/').map(encodeURIComponent).join('/')}`
}

const defaultImageRenderer = markdown.renderer.rules.image
  || ((tokens, index, options, env, self) => self.renderToken(tokens, index, options))
markdown.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index]
  token.attrSet('src', assetUrl(token.attrGet('src')))
  token.attrSet('loading', 'lazy')
  return defaultImageRenderer(tokens, index, options, env, self)
}

const renderedContent = computed(() => selected.value
  ? markdown.render(selected.value.content)
  : '')

async function api(path, options = {}) {
  const headers = new Headers(options.headers)
  headers.set('accept', 'application/json')
  if (options.body && !(options.body instanceof FormData)) headers.set('content-type', 'application/json')
  const response = await fetch(path, { ...options, headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.details || payload.error || `请求失败（${response.status}）`)
  return payload
}

async function loadDocuments() {
  loading.value = true
  error.value = ''
  try {
    const payload = await api('/api/admin/private-notes')
    documents.value = payload.documents ?? []
    if (selected.value) {
      const current = documents.value.find(({ id }) => id === selected.value.id)
      if (current) await selectDocument(current)
      else selected.value = null
    }
  } catch (caught) {
    error.value = caught.message
  } finally {
    loading.value = false
  }
}

async function selectDocument(document) {
  error.value = ''
  try {
    const payload = await api(`/api/admin/private-notes/${document.id}`)
    selected.value = payload.document
  } catch (caught) {
    error.value = caught.message
  }
}

function filesFromInput(event) {
  const files = [...(event.target.files ?? [])]
  event.target.value = ''
  void uploadFiles(files)
}

function filesFromDrop(event) {
  dragging.value = false
  const files = [...event.dataTransfer.files]
  const packageFile = files.find((file) => /\.zip$/i.test(file.name))
  if (packageFile) void uploadPackage(packageFile)
  else void uploadFiles(files)
}

async function uploadFiles(files) {
  const markdownFiles = files.filter((file) => /\.(?:md|markdown)$/i.test(file.name))
  if (!markdownFiles.length) {
    error.value = '请选择 .md 或 .markdown 文件。'
    return
  }
  uploading.value = true
  error.value = ''
  message.value = ''
  try {
    for (const file of markdownFiles) {
      const form = new FormData()
      form.append('file', file, file.name)
      const result = await api('/api/admin/private-notes/upload', { method: 'POST', body: form })
      message.value = result.replaced ? `已更新：${file.name}` : `已上传：${file.name}`
    }
    await loadDocuments()
  } catch (caught) {
    error.value = caught.message
  } finally {
    uploading.value = false
  }
}

function packageFromInput(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file) void uploadPackage(file)
}

async function uploadPackage(file) {
  if (!/\.zip$/i.test(file.name)) {
    error.value = '请选择包含一篇 Markdown 和图片资源的 .zip 文件。'
    return
  }
  uploading.value = true
  error.value = ''
  message.value = ''
  try {
    const form = new FormData()
    form.append('package', file, file.name)
    const result = await api('/api/admin/private-notes/upload-package', { method: 'POST', body: form })
    message.value = result.replaced
      ? `已更新：${result.document.filename}（${result.assetCount} 张图片）`
      : `已上传：${result.document.filename}（${result.assetCount} 张图片）`
    await loadDocuments()
  } catch (caught) {
    error.value = caught.message
  } finally {
    uploading.value = false
  }
}

async function removeDocument(document) {
  if (!window.confirm(`确定删除私有笔记“${document.filename}”吗？`)) return
  error.value = ''
  message.value = ''
  try {
    await api(`/api/admin/private-notes/${document.id}`, { method: 'DELETE' })
    if (selected.value?.id === document.id) selected.value = null
    message.value = `已删除：${document.filename}`
    await loadDocuments()
  } catch (caught) {
    error.value = caught.message
  }
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`
  return `${(value / 1024).toFixed(value < 10240 ? 1 : 0)} KiB`
}

onMounted(() => void loadDocuments())
</script>

<template>
  <main class="private-notes-admin">
    <header class="private-notes-admin__header">
      <div>
        <p>PRIVATE NOTES / ACCESS ONLY</p>
        <h1>私有 Markdown 笔记</h1>
        <span>仅你本人可通过 Cloudflare Access 读取 · 不进入公开知识库</span>
      </div>
      <nav aria-label="管理导航">
        <a href="/admin/home">主页管理</a>
        <a href="/#home">返回个人 OS</a>
      </nav>
    </header>

    <p v-if="message" class="private-notes-admin__notice" role="status">{{ message }}</p>
    <p v-if="error" class="private-notes-admin__error" role="alert">{{ error }}</p>

    <section
      class="private-notes-admin__dropzone"
      :class="{ 'is-dragging': dragging }"
      aria-labelledby="upload-title"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="filesFromDrop"
    >
      <div>
        <small>UPLOAD</small>
        <h2 id="upload-title">把本地 Markdown 放进私有空间</h2>
        <p>拖拽 Markdown 或 ZIP 到这里。ZIP 内放一篇 Markdown 和它引用的图片，系统会自动保持相对路径。</p>
      </div>
      <div class="private-notes-admin__pickers">
      <label class="private-notes-admin__picker">
        <span>{{ uploading ? '正在上传…' : '选择 Markdown' }}</span>
        <input type="file" accept=".md,.markdown,text/markdown" multiple :disabled="uploading" @change="filesFromInput" />
      </label>
      <label class="private-notes-admin__picker private-notes-admin__picker--package">
        <span>{{ uploading ? '正在上传…' : '选择笔记 ZIP' }}</span>
        <input type="file" accept=".zip,application/zip" :disabled="uploading" @change="packageFromInput" />
      </label>
      </div>
      <small>Markdown 最大 512 KiB · 图片总量最大 20 MiB · 仅你可见 · 不进入公开问答索引</small>
    </section>

    <div class="private-notes-admin__workspace">
      <section class="private-notes-admin__list" aria-labelledby="documents-title">
        <div class="private-notes-admin__section-heading">
          <div>
            <small>LIBRARY</small>
            <h2 id="documents-title">我的私有笔记</h2>
          </div>
          <button type="button" :disabled="loading || uploading" @click="loadDocuments">刷新</button>
        </div>
        <p v-if="loading">正在读取私有索引…</p>
        <p v-else-if="!documents.length" class="private-notes-admin__empty">还没有上传笔记。</p>
        <ul v-else class="private-notes-admin__items">
          <li v-for="document in documents" :key="document.id" :class="{ 'is-selected': selected?.id === document.id }">
            <button type="button" class="private-notes-admin__document" @click="selectDocument(document)">
              <strong>{{ document.title }}</strong>
              <span>{{ document.filename }} · v{{ document.version }} · {{ formatBytes(document.byteSize) }}</span>
            </button>
            <button type="button" class="private-notes-admin__delete" :aria-label="`删除 ${document.filename}`" @click="removeDocument(document)">删除</button>
          </li>
        </ul>
      </section>

      <section class="private-notes-admin__preview" aria-labelledby="preview-title">
        <div class="private-notes-admin__section-heading">
          <div>
            <small>PREVIEW</small>
            <h2 id="preview-title">{{ selected?.title || '选择一篇笔记' }}</h2>
          </div>
        </div>
        <p v-if="!selected" class="private-notes-admin__empty">上传或选择笔记后，在这里查看内容和图片。</p>
        <div v-else class="private-notes-admin__rendered" v-html="renderedContent" />
        <details v-if="selected" class="private-notes-admin__source">
          <summary>查看原始 Markdown（{{ selected.assets?.length ?? 0 }} 个图片资源）</summary>
          <pre>{{ selected.content }}</pre>
        </details>
      </section>
    </div>
  </main>
</template>

<style scoped>
.private-notes-admin {
  min-height: 100vh;
  min-height: 100dvh;
  padding: 32px;
  background: #f7f4ec;
  color: #1e2430;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.private-notes-admin__header,
.private-notes-admin__dropzone,
.private-notes-admin__workspace,
.private-notes-admin__notice,
.private-notes-admin__error {
  width: min(1200px, 100%);
  margin-inline: auto;
}

.private-notes-admin__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.private-notes-admin__header p,
.private-notes-admin__section-heading small,
.private-notes-admin__dropzone small {
  margin: 0 0 6px;
  color: #315efb;
  font: 700 12px/1.4 "JetBrains Mono", monospace;
  letter-spacing: .08em;
}

.private-notes-admin h1,
.private-notes-admin h2,
.private-notes-admin p {
  margin-top: 0;
}

.private-notes-admin__header h1 {
  margin-bottom: 6px;
}

.private-notes-admin__header span,
.private-notes-admin__dropzone p,
.private-notes-admin__dropzone > small,
.private-notes-admin__items span,
.private-notes-admin__empty {
  color: #69707d;
}

.private-notes-admin__header span,
.private-notes-admin__items span {
  font: 12px/1.5 "JetBrains Mono", monospace;
}

.private-notes-admin__header nav {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.private-notes-admin a,
.private-notes-admin button {
  border: 1px solid #cfd6df;
  border-radius: 8px;
  background: #fffdf7;
  color: #1e2430;
  cursor: pointer;
  font: inherit;
  padding: 10px 14px;
  text-decoration: none;
}

.private-notes-admin a:hover,
.private-notes-admin button:hover:not(:disabled) {
  border-color: #315efb;
  background: #eef3ff;
}

.private-notes-admin :where(a, button, input):focus-visible {
  outline: 3px solid #315efb;
  outline-offset: 3px;
}

.private-notes-admin button:disabled {
  cursor: wait;
  opacity: .55;
}

.private-notes-admin__notice,
.private-notes-admin__error {
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 12px 14px;
}

.private-notes-admin__notice { background: #e9f7ee; color: #226b43; }
.private-notes-admin__error { background: #fff0eb; color: #9b3e23; }

.private-notes-admin__dropzone,
.private-notes-admin__list,
.private-notes-admin__preview {
  border: 1px solid #cfd6df;
  border-radius: 14px;
  background: #fffdf7;
  box-shadow: 0 12px 30px rgb(20 65 110 / 10%);
}

.private-notes-admin__dropzone {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding: 22px 24px;
  border-style: dashed;
}

.private-notes-admin__pickers {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: end;
}

.private-notes-admin__dropzone.is-dragging {
  border-color: #315efb;
  background: #eef3ff;
}

.private-notes-admin__dropzone p { margin-bottom: 8px; }
.private-notes-admin__dropzone > small { font-family: "JetBrains Mono", monospace; }

.private-notes-admin__picker {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 8px;
  background: #315efb;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
  padding: 12px 16px;
}

.private-notes-admin__picker input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  opacity: 0;
}

.private-notes-admin__picker--package { background: #eef3ff; color: #315efb; }

.private-notes-admin__workspace {
  display: grid;
  grid-template-columns: minmax(280px, .8fr) minmax(0, 1.5fr);
  gap: 20px;
}

.private-notes-admin__list,
.private-notes-admin__preview {
  min-width: 0;
  padding: 20px;
}

.private-notes-admin__section-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.private-notes-admin__section-heading h2 { margin-bottom: 0; }

.private-notes-admin__items {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.private-notes-admin__items li {
  display: flex;
  align-items: stretch;
  gap: 6px;
  border: 1px solid #dbe0e6;
  border-radius: 10px;
  padding: 5px;
}

.private-notes-admin__items li.is-selected {
  border-color: #315efb;
  box-shadow: 0 0 0 2px rgb(49 94 251 / 14%);
}

.private-notes-admin__document {
  display: grid;
  flex: 1;
  justify-items: start;
  gap: 3px;
  border: 0;
  background: transparent;
  padding: 8px;
  text-align: left;
}

.private-notes-admin__document:hover { border: 0; background: #eef3ff; }
.private-notes-admin__delete { color: #9b3e23; padding-inline: 9px; }

.private-notes-admin__preview pre {
  max-height: 560px;
  overflow: auto;
  margin: 0;
  border: 1px solid #dbe0e6;
  border-radius: 8px;
  background: #f7f8fa;
  padding: 16px;
  color: #1e2430;
  font: 13px/1.7 "JetBrains Mono", monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.private-notes-admin__rendered {
  line-height: 1.75;
}

.private-notes-admin__rendered :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 16px 0;
  border: 1px solid #d8e0eb;
  border-radius: 8px;
}

.private-notes-admin__rendered :deep(a) { color: #315efb; }
.private-notes-admin__source { margin-top: 24px; }
.private-notes-admin__source summary { cursor: pointer; color: #315efb; }

@media (max-width: 760px) {
  .private-notes-admin { padding: 20px 16px 32px; }
  .private-notes-admin__header,
  .private-notes-admin__dropzone { align-items: start; flex-direction: column; }
  .private-notes-admin__pickers { width: 100%; justify-content: start; }
  .private-notes-admin__workspace { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .private-notes-admin * { scroll-behavior: auto !important; transition-duration: 1ms !important; }
}
</style>
