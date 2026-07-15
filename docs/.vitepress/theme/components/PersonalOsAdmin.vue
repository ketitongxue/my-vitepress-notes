<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { normalizePersonalOsConfig } from '../../../../shared/personal-os-config.mjs'

const editor = ref('')
const versions = ref([])
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const error = ref('')
const dirty = ref(false)
const note = ref('')

const latestRevision = computed(() => versions.value[0]?.revision ?? 0)
const publishedRevision = computed(() => versions.value.find((version) => version.publishedAt)?.revision ?? null)

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.details || payload.error || `请求失败（${response.status}）`)
  return payload
}

function setEditor(config) {
  editor.value = JSON.stringify(config, null, 2)
  dirty.value = false
}

function parseEditor() {
  let parsed
  try {
    parsed = JSON.parse(editor.value)
  } catch {
    throw new Error('JSON 格式不正确')
  }
  return normalizePersonalOsConfig(parsed)
}

async function loadVersions({ keepEditor = false } = {}) {
  loading.value = true
  error.value = ''
  try {
    const payload = await api('/api/admin/personal-os/config')
    versions.value = payload.versions ?? []
    if (!keepEditor && versions.value[0]?.config) setEditor(versions.value[0].config)
  } catch (caught) {
    error.value = caught.message
  } finally {
    loading.value = false
  }
}

async function saveDraft() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const config = parseEditor()
    const result = await api('/api/admin/personal-os/config', {
      method: 'PUT',
      body: JSON.stringify({
        schemaVersion: 1,
        baseRevision: latestRevision.value,
        note: note.value,
        config,
      }),
    })
    dirty.value = false
    note.value = ''
    message.value = `草稿 revision ${result.revision} 已保存。`
    await loadVersions({ keepEditor: true })
  } catch (caught) {
    error.value = caught.message
  } finally {
    saving.value = false
  }
}

async function publishLatest() {
  if (dirty.value) {
    error.value = '请先保存当前修改，再发布。'
    return
  }
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const result = await api('/api/admin/personal-os/publish', {
      method: 'POST',
      body: JSON.stringify({ revision: latestRevision.value }),
    })
    message.value = `revision ${result.revision} 已发布，网站将在一分钟内读取新配置。`
    await loadVersions({ keepEditor: true })
  } catch (caught) {
    error.value = caught.message
  } finally {
    saving.value = false
  }
}

async function rollback(version) {
  if (!window.confirm(`确定回滚到 revision ${version.revision} 吗？`)) return
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const result = await api('/api/admin/personal-os/rollback', {
      method: 'POST',
      body: JSON.stringify({ revision: version.revision }),
    })
    setEditor(version.config)
    message.value = `已从 revision ${version.revision} 创建并发布 revision ${result.revision}。`
    await loadVersions({ keepEditor: true })
  } catch (caught) {
    error.value = caught.message
  } finally {
    saving.value = false
  }
}

function useVersion(version) {
  setEditor(version.config)
  message.value = `已载入 revision ${version.revision}，修改后可保存为新草稿。`
}

function warnUnsaved(event) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', warnUnsaved)
  void loadVersions()
})

onBeforeUnmount(() => window.removeEventListener('beforeunload', warnUnsaved))
</script>

<template>
  <main class="os-admin">
    <header class="os-admin__header">
      <div>
        <p>JUZx OS / D1</p>
        <h1>个人 OS 内容管理</h1>
        <span>草稿 {{ latestRevision }} · 已发布 {{ publishedRevision ?? '无' }}</span>
      </div>
      <a href="/#system">返回个人 OS</a>
    </header>

    <p v-if="message" class="os-admin__notice" role="status">{{ message }}</p>
    <p v-if="error" class="os-admin__error" role="alert">{{ error }}</p>

    <div class="os-admin__workspace">
      <section class="os-admin__editor" aria-labelledby="config-editor-title">
        <div class="os-admin__section-heading">
          <div>
            <small>CONFIGURATION</small>
            <h2 id="config-editor-title">节点与连线 JSON</h2>
          </div>
          <button type="button" :disabled="loading || saving" @click="loadVersions()">重新载入</button>
        </div>
        <textarea
          v-model="editor"
          aria-label="个人 OS 配置 JSON"
          spellcheck="false"
          @input="dirty = true"
        ></textarea>
        <label>
          版本说明
          <input v-model="note" maxlength="240" placeholder="例如：更新 AI 工作流节点" />
        </label>
        <div class="os-admin__actions">
          <button type="button" :disabled="loading || saving" @click="saveDraft">保存草稿</button>
          <button class="is-primary" type="button" :disabled="loading || saving || !latestRevision" @click="publishLatest">
            发布最新草稿
          </button>
        </div>
      </section>

      <aside class="os-admin__versions" aria-labelledby="version-title">
        <div class="os-admin__section-heading">
          <div>
            <small>VERSIONS</small>
            <h2 id="version-title">最近版本</h2>
          </div>
        </div>
        <p v-if="loading">正在读取 D1…</p>
        <ol v-else>
          <li v-for="version in versions" :key="version.revision">
            <div>
              <strong>revision {{ version.revision }}</strong>
              <span v-if="version.publishedAt">已发布</span>
            </div>
            <p>{{ version.note || '无版本说明' }}</p>
            <time>{{ version.createdAt }}</time>
            <div class="os-admin__version-actions">
              <button type="button" @click="useVersion(version)">载入</button>
              <button type="button" :disabled="saving" @click="rollback(version)">回滚到此版本</button>
            </div>
          </li>
        </ol>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.os-admin {
  min-height: 100vh;
  min-height: 100dvh;
  padding: 32px;
  background: #f7f4ec;
  color: #1e2430;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.os-admin__header,
.os-admin__workspace,
.os-admin__notice,
.os-admin__error {
  width: min(1200px, 100%);
  margin-inline: auto;
}

.os-admin__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.os-admin__header p,
.os-admin__section-heading small {
  margin: 0 0 6px;
  color: #315efb;
  font: 700 12px/1.4 "JetBrains Mono", monospace;
  letter-spacing: .08em;
}

.os-admin__header h1,
.os-admin__section-heading h2 {
  margin: 0;
}

.os-admin__header span,
.os-admin__versions time {
  color: #69707d;
  font: 12px/1.5 "JetBrains Mono", monospace;
}

.os-admin__header a,
.os-admin button {
  min-height: 40px;
  border: 1px solid rgb(49 94 251 / 35%);
  border-radius: 8px;
  background: #fffdf7;
  color: #2349c7;
  cursor: pointer;
}

.os-admin__header a {
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  text-decoration: none;
}

.os-admin__notice,
.os-admin__error {
  box-sizing: border-box;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
}

.os-admin__notice { background: #e9f7ee; color: #226b43; }
.os-admin__error { background: #fff0eb; color: #9b3e23; }

.os-admin__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
}

.os-admin__editor,
.os-admin__versions {
  box-sizing: border-box;
  padding: 24px;
  border: 1px solid rgb(40 90 135 / 28%);
  border-radius: 14px;
  background: #fffdf7;
  box-shadow: 0 8px 24px rgb(20 65 110 / 9%);
}

.os-admin__section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.os-admin__section-heading button,
.os-admin__actions button,
.os-admin__version-actions button {
  padding: 8px 13px;
}

.os-admin textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 540px;
  resize: vertical;
  padding: 16px;
  border: 1px solid rgb(40 90 135 / 35%);
  border-radius: 8px;
  background: #192232;
  color: #e9edf5;
  font: 13px/1.65 "JetBrains Mono", monospace;
  tab-size: 2;
}

.os-admin label {
  display: grid;
  gap: 7px;
  margin-top: 16px;
  color: #4d5664;
  font-size: 13px;
}

.os-admin input {
  min-height: 42px;
  padding-inline: 12px;
  border: 1px solid rgb(40 90 135 / 35%);
  border-radius: 8px;
  background: #fff;
  color: #1e2430;
}

.os-admin__actions,
.os-admin__version-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.os-admin button.is-primary {
  background: #315efb;
  color: #fff;
}

.os-admin button:disabled { cursor: not-allowed; opacity: .5; }
.os-admin button:hover:not(:disabled), .os-admin__header a:hover { background: #eaf0ff; }
.os-admin button.is-primary:hover:not(:disabled) { background: #2349c7; }
.os-admin button:focus-visible, .os-admin a:focus-visible, .os-admin textarea:focus-visible, .os-admin input:focus-visible {
  outline: 3px solid rgb(49 94 251 / 35%);
  outline-offset: 2px;
}

.os-admin__versions ol {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.os-admin__versions li {
  padding: 14px;
  border: 1px dashed rgb(49 94 251 / 30%);
  border-radius: 9px;
}

.os-admin__versions li > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.os-admin__versions li > div:first-child span {
  color: #28734b;
  font-size: 12px;
}

.os-admin__versions p { margin: 8px 0 4px; color: #69707d; font-size: 13px; }

@media (max-width: 800px) {
  .os-admin { padding: 20px 16px 40px; }
  .os-admin__header { align-items: start; }
  .os-admin__workspace { grid-template-columns: 1fr; }
  .os-admin textarea { min-height: 420px; }
}

@media (prefers-reduced-motion: reduce) {
  .os-admin * { scroll-behavior: auto !important; transition-duration: 1ms !important; }
}
</style>
