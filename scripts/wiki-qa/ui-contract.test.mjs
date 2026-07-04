import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  consumeSse,
  isActiveRequest,
  normalizeStoredHistory,
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
  assert.match(component, /aria-live=['"]polite['"]/)
  assert.match(component, /new AbortController\(\)/)
  assert.match(component, /sessionStorage\.(?:getItem|setItem|removeItem)/)
  assert.match(component, /wiki-ask:v1/)
  assert.match(component, /MAX_HISTORY_ITEMS\s*=\s*6/)
  assert.match(component, /\.slice\(-MAX_HISTORY_ITEMS\)/)
  for (const event of ['meta', 'delta', 'done', 'error']) {
    assert.match(component, new RegExp(`['"]${event}['"]`), `missing SSE event ${event}`)
  }
  assert.match(client, /PUBLISHED_WIKI_ROUTE/)
  assert.doesNotMatch(component, /v-html/)
})

test('ask styles include sticky composer, mobile layout, and reduced motion', async () => {
  const css = await read('docs/.vitepress/theme/custom.css')
  assert.match(css, /\.wiki-ask__composer[\s\S]*position:\s*sticky/)
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

test('citations accept only canonical published routes, dedupe, and cap at six', () => {
  const valid = (id, url = `/wiki/concepts/topic-${id}`) => ({ id, title: `T${id}`, url })
  const result = sanitizeCitations([
    valid('1'), valid('1'), valid('2', '/wiki/entities/entity-2'),
    valid('3', '/wiki/comparisons/compare-3'), valid('4'), valid('5'), valid('6'), valid('7'),
    valid('query', '/wiki/concepts/topic?x=1'), valid('hash', '/wiki/concepts/topic#x'),
    valid('traversal', '/wiki/concepts/../private'), valid('encoded', '/wiki/concepts/%2e%2e'),
    valid('external', 'https://evil.test/wiki/concepts/topic'),
  ], 20)
  assert.deepEqual(result.map((item) => item.id), ['1', '2', '3', '4', '5', '6'])
})
