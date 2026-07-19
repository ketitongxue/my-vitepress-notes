<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  consumeSse,
  getSessionStorage,
  isActiveRequest,
  loadSessionHistory,
  loadSessionView,
  normalizeStoredHistory,
  removeSessionHistory,
  removeSessionView,
  sanitizeCitations,
  saveSessionHistory,
  saveSessionView,
} from './wikiAskClient.mjs'

type AskState = 'idle' | 'retrieving' | 'streaming' | 'complete' | 'error'
type Role = 'user' | 'assistant'
type Citation = { id: string; number: number; title: string; section?: string; url: string }
type ChatMessage = { role: Role; content: string; sources?: Citation[] }

const props = defineProps({
  embedded: { type: Boolean, default: false },
})

const STORAGE_KEY = 'wiki-ask:v1:history'
const EMBEDDED_VIEW_KEY = 'wiki-ask:v1:view:embedded'
const PAGE_VIEW_KEY = 'wiki-ask:v1:view:page'
const MAX_HISTORY_ITEMS = 6

const question = ref('')
const messages = ref<ChatMessage[]>([])
const state = ref<AskState>('idle')
const statusText = ref('可以开始提问。')
const errorText = ref('')
const root = ref<HTMLElement | null>(null)
const conversation = ref<HTMLElement | null>(null)
let activeController: AbortController | null = null
let conversationVersion = 0
let viewReady = false
let viewTimer: number | undefined

const busy = computed(() => state.value === 'retrieving' || state.value === 'streaming')
const canSend = computed(() => question.value.trim().length > 0 && !busy.value)
const titleId = computed(() => props.embedded ? 'wiki-ask-window-title' : 'wiki-ask-title')
const questionId = computed(() => props.embedded ? 'wiki-ask-window-question' : 'wiki-ask-question')
const headingTag = computed(() => props.embedded ? 'h2' : 'h1')
const viewStorageKey = computed(() => props.embedded ? EMBEDDED_VIEW_KEY : PAGE_VIEW_KEY)

const errorMessages: Record<string, string> = {
  INVALID_QUESTION: '请输入一个有效问题。',
  QUESTION_TOO_LONG: '问题不能超过 500 个字。',
  INVALID_HISTORY: '对话记录格式异常，请清空后重试。',
  HISTORY_TOO_LONG: '对话记录过长，请清空后重试。',
  HISTORY_CONTENT_TOO_LONG: '对话内容过长，请清空后重试。',
  RATE_LIMITED_MINUTE: '提问太频繁，请一分钟后再试。',
  DAILY_VISITOR_LIMIT: '你今天的问答次数已用完，请明天再试。',
  DAILY_GLOBAL_LIMIT: '网站今天的问答额度已用完，请明天再试。',
  DEEPSEEK_TIMEOUT: '回答生成超时，请稍后重试。',
  DEEPSEEK_RATE_LIMITED: '模型服务繁忙，请稍后重试。',
  DEEPSEEK_UNAVAILABLE: '模型服务暂时不可用，请稍后重试。',
  QUOTA_UNAVAILABLE: '额度服务暂时不可用，请稍后重试。',
  SERVER_MISCONFIGURED: '问答服务尚未配置完成。',
}

function historyItems() {
  return normalizeStoredHistory(messages.value)
    .map(({ role, content }) => ({ role, content }))
}

function saveHistory() {
  saveSessionHistory(getSessionStorage(), STORAGE_KEY, messages.value)
}

function loadHistory() {
  messages.value = loadSessionHistory(getSessionStorage(), STORAGE_KEY) as ChatMessage[]
}

function saveView() {
  if (!viewReady) return
  if (viewTimer !== undefined) window.clearTimeout(viewTimer)
  viewTimer = undefined
  saveSessionView(getSessionStorage(), viewStorageKey.value, {
    question: question.value,
    rootScrollTop: root.value?.scrollTop ?? 0,
    conversationScrollTop: conversation.value?.scrollTop ?? 0,
  })
}

function scheduleViewSave() {
  if (!viewReady) return
  if (viewTimer !== undefined) window.clearTimeout(viewTimer)
  viewTimer = window.setTimeout(saveView, 100)
}

async function restoreView() {
  loadHistory()
  const saved = loadSessionView(getSessionStorage(), viewStorageKey.value)
  question.value = saved.question
  await nextTick()
  if (root.value) root.value.scrollTop = saved.rootScrollTop
  if (conversation.value) conversation.value.scrollTop = saved.conversationScrollTop
  viewReady = true
}

async function scrollToLatest() {
  await nextTick()
  conversation.value?.scrollTo({ top: conversation.value.scrollHeight, behavior: 'smooth' })
}

function friendlyError(code: string) {
  return errorMessages[code] ?? '问答服务暂时出错，请稍后重试。'
}

async function readJsonError(response: Response) {
  try {
    const body = await response.json()
    return typeof body?.error === 'string' ? body.error : 'UNKNOWN_ERROR'
  } catch {
    return 'UNKNOWN_ERROR'
  }
}

async function submitQuestion() {
  const text = question.value.trim()
  if (!text || busy.value) return

  const history = historyItems()
  const version = conversationVersion
  messages.value.push({ role: 'user', content: text })
  messages.value = messages.value.slice(-MAX_HISTORY_ITEMS)
  question.value = ''
  errorText.value = ''
  state.value = 'retrieving'
  statusText.value = '正在检索知识库…'
  saveHistory()
  await scrollToLatest()

  const answer = reactive<ChatMessage>({ role: 'assistant', content: '', sources: [] })
  messages.value.push(answer)
  activeController = new AbortController()
  const controller = activeController

  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: text, history }),
      signal: controller.signal,
    })
    if (version !== conversationVersion) return
    if (!isActiveRequest(controller.signal, version, conversationVersion)) throw new Error('REQUEST_ABORTED')
    if (!response.ok) throw new Error(await readJsonError(response))
    if (!response.headers.get('content-type')?.startsWith('text/event-stream')) {
      throw new Error('MALFORMED_STREAM')
    }

    await consumeSse(response, controller.signal, (type, raw) => {
      if (!isActiveRequest(controller.signal, version, conversationVersion)) return
      const data = raw as Record<string, unknown>
      if (type === 'meta') {
        const received = Array.isArray(data?.sources) ? data.sources : []
        answer.sources = sanitizeCitations(received, received.length)
      } else if (type === 'delta' && typeof data?.text === 'string') {
        state.value = 'streaming'
        statusText.value = '正在生成回答…'
        answer.content += data.text
        void scrollToLatest()
      } else if (type === 'done') {
        state.value = 'complete'
        statusText.value = '回答完成。'
      } else if (type === 'error') {
        throw new Error(typeof data?.code === 'string' ? data.code : 'UNKNOWN_ERROR')
      }
    })
    if (version !== conversationVersion) return
    if (!isActiveRequest(controller.signal, version, conversationVersion)) throw new Error('REQUEST_ABORTED')
    messages.value = messages.value
      .filter((message) => message !== answer || message.content.trim())
      .slice(-MAX_HISTORY_ITEMS)
    saveHistory()
  } catch (error) {
    if (version !== conversationVersion) return
    if (controller.signal.aborted) {
      messages.value = normalizeStoredHistory(
        messages.value.filter((message) => message !== answer || message.content.trim()),
      ) as ChatMessage[]
      state.value = 'complete'
      statusText.value = answer.content ? '已停止生成，保留现有回答。' : '已停止生成。'
      saveHistory()
    } else {
      const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      messages.value = messages.value.filter((message) => message !== answer || message.content.trim())
      state.value = 'error'
      errorText.value = friendlyError(code)
      statusText.value = '回答失败。'
      if (answer.content) saveHistory()
    }
  } finally {
    if (activeController === controller) activeController = null
    await scrollToLatest()
  }
}

function stopGeneration() {
  activeController?.abort()
}

function clearConversation() {
  conversationVersion += 1
  activeController?.abort()
  activeController = null
  messages.value = []
  question.value = ''
  errorText.value = ''
  state.value = 'idle'
  statusText.value = '对话已清空，可以重新提问。'
  removeSessionHistory(getSessionStorage(), STORAGE_KEY)
  removeSessionView(getSessionStorage(), viewStorageKey.value)
  void nextTick(() => {
    root.value?.scrollTo({ top: 0 })
    conversation.value?.scrollTo({ top: 0 })
  })
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void submitQuestion()
  }
}

watch(question, scheduleViewSave)
onMounted(() => { void restoreView() })
onBeforeUnmount(() => {
  saveView()
  conversationVersion += 1
  activeController?.abort()
  activeController = null
})
</script>

<template>
  <section
    ref="root"
    class="wiki-ask"
    :class="{ 'wiki-ask--embedded': props.embedded }"
    :aria-labelledby="titleId"
    @scroll.passive="scheduleViewSave"
  >
    <header class="wiki-ask__intro">
      <p class="wiki-ask__eyebrow">知识库问答</p>
      <component :is="headingTag" :id="titleId">向知识库提问</component>
      <p>回答仅基于 AI 知识库中已发布的中文页面，并附上可继续阅读的站内引用。</p>
      <a class="wiki-ask__browse" href="/wiki/" @click="saveView">浏览 AI 知识库</a>
      <div class="wiki-ask__examples" aria-label="示例问题">
        <button type="button" @click="question = 'Claude Code 的权限模型是什么？'">Claude Code 的权限模型是什么？</button>
        <button type="button" @click="question = '上下文工程有哪些关键原则？'">上下文工程有哪些关键原则？</button>
      </div>
    </header>

    <div
      v-if="messages.length > 0 || busy"
      ref="conversation"
      class="wiki-ask__conversation"
      aria-label="问答对话"
      @scroll.passive="scheduleViewSave"
    >
      <article v-for="(message, index) in messages" :key="index" :class="['wiki-ask__message', `is-${message.role}`]">
        <p class="wiki-ask__role">{{ message.role === 'user' ? '你' : '知识库助手' }}</p>
        <p class="wiki-ask__answer">{{ message.content || '…' }}</p>
        <ul v-if="message.sources?.length" class="wiki-ask__citations" aria-label="回答引用">
          <li v-for="source in message.sources" :key="source.id">
            <a :href="source.url" @click="saveView">
              <span>[{{ source.number }}] {{ source.title }}</span>
              <small v-if="source.section">{{ source.section }}</small>
            </a>
          </li>
        </ul>
      </article>
      <div v-if="busy" class="wiki-ask__loading" role="status">
        <span aria-hidden="true" />{{ state === 'retrieving' ? '正在检索知识库' : '正在生成回答' }}
      </div>
    </div>

    <p v-if="messages.length > 0 || busy" class="wiki-ask__status" aria-live="polite">{{ statusText }}</p>
    <p v-if="errorText" class="wiki-ask__error" role="alert">{{ errorText }}</p>

    <form class="wiki-ask__composer" @submit.prevent="submitQuestion">
      <label :for="questionId">你的问题</label>
      <textarea
        :id="questionId"
        v-model="question"
        rows="3"
        maxlength="500"
        :disabled="busy"
        placeholder="例如：如何构建有效的产品反馈循环？"
        @keydown="handleKeydown"
      />
      <div class="wiki-ask__actions">
        <p>Ctrl / ⌘ + Enter 发送</p>
        <button v-if="busy" type="button" class="secondary" @click="stopGeneration">停止生成</button>
        <button v-if="messages.length > 0" type="button" class="secondary" @click="clearConversation">清空对话</button>
        <button type="submit" :disabled="!canSend">发送</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.wiki-ask.wiki-ask--embedded {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 18px 20px 20px;
  overflow: auto;
  background: #fffdf7;
  color: #252b36;
}

.wiki-ask--embedded .wiki-ask__intro {
  max-width: none;
  flex: 0 0 auto;
  margin: 0;
}

.wiki-ask--embedded .wiki-ask__intro :is(h1, h2) {
  margin: 2px 0 7px;
  color: #1e2430;
  font-size: clamp(22px, 3vw, 30px);
  line-height: 1.15;
}

.wiki-ask--embedded .wiki-ask__intro > p:not(.wiki-ask__eyebrow) {
  margin: 0 0 5px;
  color: #69707d;
  font-size: 13px;
  line-height: 1.6;
}

.wiki-ask--embedded .wiki-ask__eyebrow {
  margin: 0;
  color: #315efb;
}

.wiki-ask--embedded .wiki-ask__browse {
  color: #1e4dc0;
  font-size: 13px;
}

.wiki-ask--embedded .wiki-ask__examples {
  gap: 6px;
  margin-top: 10px;
}

.wiki-ask--embedded .wiki-ask__examples button {
  padding: 6px 9px;
  border-color: rgb(49 94 251 / 20%);
  background: #f0f4fa;
  color: #31405a;
  font-size: 12px;
}

.wiki-ask--embedded .wiki-ask__conversation {
  min-height: 120px;
  max-height: none;
  flex: 1 1 200px;
  gap: 10px;
  padding: 12px;
  border-color: rgb(64 125 180 / 28%);
  border-radius: 10px;
  background: #f7f9fc;
}

.wiki-ask--embedded .wiki-ask__message {
  width: min(92%, 680px);
  padding: 10px 12px;
  border-color: rgb(64 125 180 / 24%);
  border-radius: 10px;
  background: #fffdf7;
  color: #252b36;
}

.wiki-ask--embedded .wiki-ask__role {
  color: #315efb;
}

.wiki-ask--embedded .wiki-ask__citations a {
  background: #fffdf7;
  color: #1e2430;
}

.wiki-ask--embedded .wiki-ask__status {
  min-height: 18px;
  margin: 0 2px;
  color: #69707d;
}

.wiki-ask--embedded .wiki-ask__composer {
  position: static;
  bottom: auto;
  flex: 0 0 auto;
  margin-top: auto;
  padding: 12px;
  border-color: rgb(64 125 180 / 30%);
  border-radius: 10px;
  background: #eef3f8;
  box-shadow: 0 6px 16px rgb(20 65 110 / 12%);
  backdrop-filter: none;
}

.wiki-ask--embedded .wiki-ask__composer textarea {
  min-height: 74px;
  resize: none;
  border-color: rgb(64 125 180 / 30%);
  background: #fffdf7;
  color: #252b36;
}

.wiki-ask--embedded .wiki-ask__actions {
  gap: 7px;
  margin-top: 8px;
}

.wiki-ask--embedded .wiki-ask__actions p {
  color: #69707d;
}

.wiki-ask--embedded button {
  padding: 7px 11px;
  border-color: #315efb;
  background: #315efb;
  color: #fff;
  font-size: 12px;
}

.wiki-ask--embedded button.secondary {
  border-color: rgb(49 94 251 / 22%);
  background: #fffdf7;
  color: #31405a;
}

@media (max-width: 767px) {
  .wiki-ask.wiki-ask--embedded {
    padding: 14px;
  }

  .wiki-ask--embedded .wiki-ask__intro :is(h1, h2) {
    font-size: 22px;
  }

  .wiki-ask--embedded .wiki-ask__actions {
    flex-wrap: wrap;
  }

  .wiki-ask--embedded .wiki-ask__actions p {
    flex-basis: 100%;
  }
}
</style>
