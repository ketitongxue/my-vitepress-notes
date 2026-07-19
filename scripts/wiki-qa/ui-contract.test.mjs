import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  consumeSse,
  getSessionStorage,
  isActiveRequest,
  loadSessionHistory,
  loadSessionView,
  normalizeSessionView,
  normalizeStoredHistory,
  removeSessionHistory,
  removeSessionView,
  saveSessionHistory,
  saveSessionView,
  sanitizeCitations,
} from '../../docs/.vitepress/theme/components/wikiAskClient.mjs'

const root = new URL('../../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('navigation and page expose the dedicated ask experience', async () => {
  const [config, page] = await Promise.all([
    read('docs/.vitepress/config.mts'),
    read('docs/ask/index.md'),
  ])
  assert.match(config, /text:\s*['"]问答['"],\s*link:\s*['"]\/ask\/['"]/)
  assert.match(page, /layout:\s*page/)
  assert.match(page, /WikiAsk/)
})

test('component meets interaction, persistence, stream, and safety contracts', async () => {
  const [component, client] = await Promise.all([
    read('docs/.vitepress/theme/components/WikiAsk.vue'),
    read('docs/.vitepress/theme/components/wikiAskClient.mjs'),
  ])

  for (const state of ['idle', 'retrieving', 'streaming', 'complete', 'error']) {
    assert.match(component, new RegExp(`['"]${state}['"]`), `missing state ${state}`)
  }
  assert.match(component, /<label[^>]*for=/)
  assert.match(component, /<textarea[^>]*id=/)
  assert.match(component, /发送/)
  assert.match(component, /停止生成/)
  assert.match(component, /清空对话/)
  assert.match(component, /v-if="messages\.length > 0 \|\| busy"[^>]*class="wiki-ask__conversation"/)
  assert.match(component, /v-if="messages\.length > 0 \|\| busy"[^>]*class="wiki-ask__status"/)
  assert.match(component, /v-if="busy"[^>]*>停止生成<\/button>/)
  assert.match(component, /v-if="messages\.length > 0"[^>]*>清空对话<\/button>/)
  assert.match(component, /回答仅基于 AI 知识库/)
  assert.match(component, /href="\/wiki\/"/)
  assert.doesNotMatch(component, /金融知识库/)
  assert.match(component, /aria-live=['"]polite['"]/)
  assert.match(component, /new AbortController\(\)/)
  assert.match(component, /embedded:\s*\{\s*type:\s*Boolean,\s*default:\s*false\s*\}/)
  assert.match(component, /wiki-ask--embedded/)
  assert.match(component, /onBeforeUnmount\([\s\S]*activeController\?\.abort\(\)/)
  assert.match(component, /(?:load|save|remove)SessionHistory\(getSessionStorage\(\)/)
  assert.match(client, /storage\?\.(?:getItem|setItem|removeItem)/)
  assert.match(component, /wiki-ask:v1/)
  assert.match(component, /wiki-ask:v1:view:embedded/)
  assert.match(component, /loadSessionView/)
  assert.match(component, /saveSessionView/)
  assert.match(component, /@scroll\.passive="scheduleViewSave"/)
  assert.match(component, /onBeforeUnmount\([\s\S]*saveView\(\)/)
  assert.match(component, /MAX_HISTORY_ITEMS\s*=\s*6/)
  assert.match(component, /\.slice\(-MAX_HISTORY_ITEMS\)/)
  for (const event of ['meta', 'delta', 'done', 'error']) {
    assert.match(component, new RegExp(`['"]${event}['"]`), `missing SSE event ${event}`)
  }
  assert.match(client, /PUBLISHED_WIKI_ROUTE/)
  assert.match(component, /\{\{ source\.number \}\}/)
  assert.doesNotMatch(component, /sourceIndex\s*\+\s*1/)
  assert.doesNotMatch(component, /v-html/)
})

test('ask styles include sticky composer, mobile layout, and reduced motion', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  assert.match(css, /\.wiki-ask__composer[\s\S]*position:\s*sticky/)
  assert.doesNotMatch(css, /\.wiki-ask__conversation[\s\S]{0,400}min-height:\s*190px/)
  assert.match(css, /@media\s*\(max-width:\s*720px\)/)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})

test('SSE parser handles CR-only framing and UTF-8 split byte by byte', async () => {
  const bytes = new TextEncoder().encode(
    'event: meta\rdata: {"sources":[]}\r\r'
    + 'event: delta\rdata: {"text":"你"}\r\r'
    + 'event: done\rdata: {"ok":\rdata: true}\r\r',
  )
  const stream = new ReadableStream({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
      controller.close()
    },
  })
  const events = []
  await consumeSse(new Response(stream), new AbortController().signal, (type, data) => {
    events.push({ type, data })
  })
  assert.deepEqual(events, [
    { type: 'meta', data: { sources: [] } },
    { type: 'delta', data: { text: '你' } },
    { type: 'done', data: { ok: true } },
  ])
})

test('SSE parser cancels and suppresses buffered events after abort', async () => {
  let cancelled = false
  let streamController
  const stream = new ReadableStream({
    start(controller) { streamController = controller },
    cancel() { cancelled = true },
  })
  const abort = new AbortController()
  const events = []
  const consuming = consumeSse(new Response(stream), abort.signal, (...event) => events.push(event))
  streamController.enqueue(new TextEncoder().encode('event: delta\ndata: {"text":"late"}'))
  abort.abort()
  await consuming
  assert.equal(cancelled, true)
  assert.deepEqual(events, [])
})

test('first terminal event cancels the reader and suppresses trailing events', async () => {
  let cancelled = false
  const body = new TextEncoder().encode(
    'event: done\ndata: {"ok":true}\n\nevent: delta\ndata: {"text":"forbidden"}\n\n',
  )
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(body) },
    cancel() { cancelled = true },
  })
  const events = []
  await consumeSse(new Response(stream), new AbortController().signal, (type, data) => events.push({ type, data }))
  assert.deepEqual(events, [{ type: 'done', data: { ok: true } }])
  assert.equal(cancelled, true)
})

test('malformed, incomplete, and callback failures cancel their readers', async () => {
  for (const scenario of [
    { payload: 'event: delta\ndata: nope\n\n', callback() {} },
    { payload: 'event: delta\ndata: {"text":"partial"}\n\n', callback() {} },
    { payload: 'event: delta\ndata: {"text":"x"}\n\n', callback() { throw new Error('CALLBACK_FAILED') } },
  ]) {
    let cancelled = false
    let released = false
    let reads = 0
    const response = {
      body: {
        getReader() {
          return {
            async read() {
              reads += 1
              return reads === 1
                ? { done: false, value: new TextEncoder().encode(scenario.payload) }
                : { done: true, value: undefined }
            },
            async cancel() { cancelled = true },
            releaseLock() { released = true },
          }
        },
      },
    }
    await assert.rejects(
      consumeSse(response, new AbortController().signal, scenario.callback),
      /MALFORMED_STREAM|INCOMPLETE_STREAM|CALLBACK_FAILED/,
    )
    assert.equal(cancelled, true)
    assert.equal(released, true)
  }
})

test('newline-free megabyte input fails at a bounded pending line', async () => {
  let cancelled = false
  const chunk = new TextEncoder().encode('x'.repeat(1024 * 1024))
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(chunk) },
    cancel() { cancelled = true },
  })
  await assert.rejects(
    consumeSse(new Response(stream), new AbortController().signal, () => {}),
    /MALFORMED_STREAM/,
  )
  assert.equal(cancelled, true)
})

test('aggregate delta output is capped at the server 32 KiB ceiling', async () => {
  let cancelled = false
  const delta = (text) => `event: delta\ndata: ${JSON.stringify({ text })}\n\n`
  const payload = delta('a'.repeat(20 * 1024)) + delta('b'.repeat(13 * 1024))
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode(payload)) },
    cancel() { cancelled = true },
  })
  await assert.rejects(
    consumeSse(new Response(stream), new AbortController().signal, () => {}),
    /MALFORMED_STREAM/,
  )
  assert.equal(cancelled, true)
})

test('clear-version and stop-signal guards reject late stream mutations', () => {
  const abort = new AbortController()
  let state = 'idle'
  const apply = (requestVersion, currentVersion) => {
    if (isActiveRequest(abort.signal, requestVersion, currentVersion)) state = 'streaming'
  }
  apply(1, 2)
  assert.equal(state, 'idle')
  abort.abort()
  apply(2, 2)
  assert.equal(state, 'idle')
})

test('persisted history is valid, last-six, and at most 6000 Unicode code points', () => {
  const oversized = [
    { role: 'user', content: 'old' },
    ...Array.from({ length: 7 }, (_, index) => ({
      role: index % 2 ? 'assistant' : 'user',
      content: index === 6 ? `tail-${'😀'.repeat(7000)}` : `message-${index}`,
    })),
  ]
  const normalized = normalizeStoredHistory(oversized)
  assert.ok(normalized.length <= 6)
  assert.ok(normalized.reduce((sum, item) => sum + [...item.content].length, 0) <= 6000)
  assert.equal(normalized.at(-1).content.endsWith('😀'), true)
  assert.equal(Array.from(normalized.at(-1).content).some((character) => {
    const code = character.charCodeAt(0)
    return character.length === 1 && code >= 0xD800 && code <= 0xDFFF
  }), false)
})

test('session storage denial never escapes get, set, or remove helpers', () => {
  const denied = {
    getItem() { throw new Error('denied') },
    setItem() { throw new Error('denied') },
    removeItem() { throw new Error('denied') },
  }
  assert.deepEqual(loadSessionHistory(denied, 'key'), [])
  assert.equal(saveSessionHistory(denied, 'key', [{ role: 'user', content: 'q' }]), false)
  assert.equal(removeSessionHistory(denied, 'key'), false)
  const deniedWindow = Object.defineProperty({}, 'sessionStorage', {
    get() { throw new Error('denied') },
  })
  assert.equal(getSessionStorage(deniedWindow), null)
})

test('ask view cache preserves a bounded draft and scroll positions', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  const key = 'wiki-ask:v1:view:embedded'
  assert.equal(saveSessionView(storage, key, {
    question: `草稿${'问'.repeat(600)}`,
    rootScrollTop: 132.7,
    conversationScrollTop: 488.2,
  }), true)
  assert.deepEqual(loadSessionView(storage, key), {
    question: `草稿${'问'.repeat(498)}`,
    rootScrollTop: 133,
    conversationScrollTop: 488,
  })
  assert.equal(removeSessionView(storage, key), true)
  assert.deepEqual(loadSessionView(storage, key), normalizeSessionView(null))
})

test('ask view cache fails safely when session storage is unavailable or corrupt', () => {
  const denied = {
    getItem() { throw new Error('denied') },
    setItem() { throw new Error('denied') },
    removeItem() { throw new Error('denied') },
  }
  assert.deepEqual(loadSessionView(denied, 'key'), normalizeSessionView(null))
  assert.equal(saveSessionView(denied, 'key', { question: 'draft' }), false)
  assert.equal(removeSessionView(denied, 'key'), false)
  assert.deepEqual(normalizeSessionView({
    question: 42,
    rootScrollTop: -8,
    conversationScrollTop: Number.POSITIVE_INFINITY,
  }), {
    question: '',
    rootScrollTop: 0,
    conversationScrollTop: 0,
  })
})

test('citations preserve original positions, allow same-page chunks, dedupe IDs, and cap at six', () => {
  const valid = (id, url = `/wiki/concepts/topic-${id}`) => ({ id, title: `T${id}`, url })
  const result = sanitizeCitations([
    valid('1'),
    valid('2', '/wiki/entities/entity-2'),
    valid('bad', '/wiki/concepts/topic?x=1'),
    valid('4', '/wiki/comparisons/shared-page'),
    valid('2', '/wiki/concepts/duplicate-id'),
    valid('6', '/wiki/comparisons/shared-page'),
    valid('7'),
  ], 20)
  assert.deepEqual(result.map(({ id, number, url }) => ({ id, number, url })), [
    { id: '1', number: 1, url: '/wiki/concepts/topic-1' },
    { id: '2', number: 2, url: '/wiki/entities/entity-2' },
    { id: '4', number: 4, url: '/wiki/comparisons/shared-page' },
    { id: '6', number: 6, url: '/wiki/comparisons/shared-page' },
  ])
})

test('stored citation gaps retain their canonical original numbers', () => {
  const history = normalizeStoredHistory([{
    role: 'assistant',
    content: 'answer [1] [4] [6]',
    sources: [
      { id: '1', number: 1, title: 'One', url: '/wiki/concepts/one' },
      { id: '4', number: 4, title: 'Four', url: '/wiki/concepts/shared' },
      { id: '6', number: 6, title: 'Six', url: '/wiki/concepts/shared' },
    ],
  }])
  assert.deepEqual(history[0].sources.map((source) => source.number), [1, 4, 6])
})

test('stored citations retain only the first source for each canonical number', () => {
  const history = normalizeStoredHistory([{
    role: 'assistant',
    content: 'answer [1]',
    sources: [
      { id: 'first', number: 1, title: 'First', url: '/wiki/concepts/first' },
      { id: 'corrupt', number: 1, title: 'Corrupt', url: '/wiki/entities/corrupt' },
      { id: 'second', number: 2, title: 'Second', url: '/wiki/concepts/second' },
    ],
  }])
  assert.deepEqual(history[0].sources.map(({ id, number }) => ({ id, number })), [
    { id: 'first', number: 1 },
    { id: 'second', number: 2 },
  ])
})

test('error colors use theme variables with AA contrast in light and dark modes', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  assert.match(css, /--wiki-ask-error-text:\s*#8b1e35/)
  assert.match(css, /\.dark\s*\{[\s\S]*--wiki-ask-error-text:\s*#ffd5dc/)
  assert.match(css, /\.wiki-ask__error[\s\S]*color:\s*var\(--wiki-ask-error-text\)/)

  const luminance = (hex) => {
    const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  }
  const contrast = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (values[0] + 0.05) / (values[1] + 0.05)
  }
  assert.ok(contrast('8b1e35', 'fff0f3') >= 4.5)
  assert.ok(contrast('ffd5dc', '3a1720') >= 4.5)
})
