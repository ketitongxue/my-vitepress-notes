import assert from 'node:assert/strict'
import test from 'node:test'

import { handleAsk } from './ask.mjs'

const encoder = new TextEncoder()
const secretQuestion = '什么是注意力？'
const secretIp = '203.0.113.42'
const secretKey = 'deepseek-private-key'
const secretText = '注意力是一段不应该出现在元数据的知识正文。'

const index = {
  chunks: [{
    id: 'chunk-1', title: '注意力', section: '定义',
    url: '/wiki/concepts/attention', text: secretText, tags: ['attention'],
  }],
}

function request(body = { question: secretQuestion, history: [] }, headers = {}) {
  return new Request('https://juzxailab.com/api/ask', {
    method: 'POST',
    headers: {
      origin: 'https://juzxailab.com',
      'content-type': 'application/json',
      'cf-connecting-ip': secretIp,
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

function env(overrides = {}) {
  return {
    ALLOWED_ORIGIN: 'https://juzxailab.com',
    IP_HASH_SALT: 'private-hmac-salt',
    DEEPSEEK_API_KEY: secretKey,
    DEEPSEEK_MODEL: 'deepseek-v4-flash',
    DAILY_PER_IP_LIMIT: '30',
    DAILY_GLOBAL_LIMIT: '50',
    QA_RATE_LIMITER: { async limit() { return { success: true } } },
    QA_QUOTA: { idFromName() { return 'id' }, get() { return { fetch() {} } } },
    ...overrides,
  }
}

function retrieval(confident = true) {
  return {
    confident,
    sources: [{ ...index.chunks[0], score: 99 }],
    chunks: [index.chunks[0]],
    context: secretText,
  }
}

function objectStream(items, { cancel } = {}) {
  return new ReadableStream({
    start(controller) {
      for (const item of items) controller.enqueue(item)
      controller.close()
    },
    cancel,
  })
}

function baseDeps(overrides = {}) {
  const calls = []
  const logs = []
  return {
    calls,
    logs,
    deps: {
      index,
      randomUUID: () => 'request-safe-id',
      now: (() => { let value = 100; return () => value++ })(),
      logger: { info(entry) { logs.push(entry) } },
      async hashVisitor(ip, salt) {
        calls.push(['hash', ip, salt])
        if (!ip || !salt) throw new Error('misconfigured')
        return 'a'.repeat(64)
      },
      async checkMinuteLimit(_env, key) {
        calls.push(['minute', key])
        return { ok: true }
      },
      retrieve(_index, question, history) {
        calls.push(['retrieve', _index, question, history])
        return retrieval(true)
      },
      async reserveDailyQuota(_env, input) {
        calls.push(['quota', input])
        return { allowed: true, globalCount: 1, visitorCount: 1 }
      },
      async streamDeepSeek(options) {
        calls.push(['deepseek', options])
        return objectStream([
          { type: 'delta', text: '回答 [1]' },
          { type: 'done', usage: { total_tokens: 8 } },
        ])
      },
      ...overrides,
    },
  }
}

async function events(response) {
  const text = await response.text()
  return text.trim().split(/\n\n/).filter(Boolean).map((block) => {
    const lines = block.split('\n')
    return { type: lines[0].slice(7), data: JSON.parse(lines.slice(1).map((line) => line.slice(6)).join('\n')) }
  })
}

test('runs the complete pipeline in order and streams safe meta before delta and done', async () => {
  const state = baseDeps()
  const response = await handleAsk(request(), env(), {}, state.deps)
  const output = await events(response)

  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /^text\/event-stream/)
  assert.deepEqual(state.calls.map(([name]) => name), ['hash', 'minute', 'retrieve', 'quota', 'deepseek'])
  assert.deepEqual(output, [
    { type: 'meta', data: { sources: [{ id: 'chunk-1', title: '注意力', section: '定义', url: '/wiki/concepts/attention' }] } },
    { type: 'delta', data: { text: '回答 [1]' } },
    { type: 'done', data: { usage: { total_tokens: 8 } } },
  ])
  const deepSeek = state.calls.find(([name]) => name === 'deepseek')[1]
  assert.equal(deepSeek.apiKey, secretKey)
  assert.equal(deepSeek.model, 'deepseek-v4-flash')
  assert.deepEqual(deepSeek.sources, [{ title: '注意力', section: '定义', url: '/wiki/concepts/attention', text: secretText }])
  assert.deepEqual(state.logs, [{ requestId: 'request-safe-id', status: 200, duration: 1, retrievalCount: 1, tokenUsage: { total_tokens: 8 } }])
})

test('validation failure stops before HMAC and returns the validator response', async () => {
  const state = baseDeps()
  const response = await handleAsk(request({ question: '', history: [] }), env(), {}, state.deps)
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'INVALID_QUESTION' })
  assert.deepEqual(state.calls, [])
})

test('minute denial stops before retrieval, quota, and DeepSeek', async () => {
  const state = baseDeps({
    async checkMinuteLimit() { state.calls.push(['minute']); return { ok: false, response: Response.json({ error: 'RATE_LIMITED_MINUTE' }, { status: 429 }) } },
  })
  const response = await handleAsk(request(), env(), {}, state.deps)
  assert.equal(response.status, 429)
  assert.deepEqual(state.calls.map(([name]) => name), ['hash', 'minute'])
})

test('no confident recall returns weak safe metadata and a local answer without quota or DeepSeek', async () => {
  const state = baseDeps({
    retrieve() { state.calls.push(['retrieve']); return retrieval(false) },
  })
  const response = await handleAsk(request(), env(), {}, state.deps)
  const output = await events(response)
  assert.deepEqual(state.calls.map(([name]) => name), ['hash', 'minute', 'retrieve'])
  assert.deepEqual(output, [
    { type: 'meta', data: { sources: [{ id: 'chunk-1', title: '注意力', section: '定义', url: '/wiki/concepts/attention' }], noAnswer: true } },
    { type: 'delta', data: { text: '知识库中没有足够信息回答这个问题。' } },
    { type: 'done', data: { reason: 'NO_CONFIDENT_RECALL', usage: null } },
  ])
})

test('no confident recall still fails closed when required production configuration is missing', async () => {
  for (const missing of [
    'ALLOWED_ORIGIN',
    'IP_HASH_SALT',
    'DEEPSEEK_API_KEY',
    'DEEPSEEK_MODEL',
    'DAILY_PER_IP_LIMIT',
    'DAILY_GLOBAL_LIMIT',
    'QA_RATE_LIMITER',
    'QA_QUOTA',
  ]) {
    const state = baseDeps({
      retrieve() { state.calls.push(['retrieve']); return retrieval(false) },
    })
    const configured = env()
    delete configured[missing]
    const response = await handleAsk(request(), configured, {}, state.deps)
    assert.equal(response.status, 503, missing)
    assert.deepEqual(await response.json(), { error: 'SERVER_MISCONFIGURED' }, missing)
    assert.equal(state.calls.some(([name]) => name === 'quota' || name === 'deepseek'), false, missing)
  }
})

test('forged and unknown retrieval identities never reach the model, response, or logs', async () => {
  const privateSentinel = 'PRIVATE_SENTINEL_DO_NOT_LEAK'
  const state = baseDeps({
    retrieve() {
      state.calls.push(['retrieve'])
      return {
        confident: true,
        sources: [{ id: 'forged-id', title: privateSentinel, section: privateSentinel, url: index.chunks[0].url }],
        chunks: [{ id: 'forged-id', title: privateSentinel, section: privateSentinel, url: index.chunks[0].url, text: privateSentinel }],
      }
    },
  })

  const response = await handleAsk(request(), env(), {}, state.deps)
  const serialized = `${await response.text()}\n${JSON.stringify(state.logs)}\n${JSON.stringify(state.calls)}`
  assert.doesNotMatch(serialized, /PRIVATE_SENTINEL_DO_NOT_LEAK/)
  assert.deepEqual(state.calls.map(([name]) => name), ['hash', 'minute', 'retrieve'])
})

test('same-ID tampering is ignored and model and meta receive canonical index fields only', async () => {
  const privateSentinel = 'PRIVATE_SENTINEL_SAME_ID'
  const canonical = index.chunks[0]
  const state = baseDeps({
    retrieve() {
      state.calls.push(['retrieve'])
      return {
        confident: true,
        sources: [{ id: canonical.id, title: privateSentinel, section: privateSentinel, url: canonical.url }],
        chunks: [{ ...canonical, title: privateSentinel, section: privateSentinel, text: privateSentinel }],
      }
    },
  })

  const response = await handleAsk(request(), env(), {}, state.deps)
  const output = await events(response)
  assert.deepEqual(output[0], {
    type: 'meta',
    data: { sources: [{ id: canonical.id, title: canonical.title, section: canonical.section, url: canonical.url }] },
  })
  const options = state.calls.find(([name]) => name === 'deepseek')[1]
  assert.deepEqual(options.sources, [{
    title: canonical.title,
    section: canonical.section,
    url: canonical.url,
    text: canonical.text,
  }])
  assert.doesNotMatch(`${JSON.stringify(output)}\n${JSON.stringify(options.sources)}\n${JSON.stringify(state.logs)}`, /PRIVATE_SENTINEL_SAME_ID/)
})

test('daily denials map to stable 429 errors and never call DeepSeek', async () => {
  for (const [reason, code] of [['GLOBAL_LIMIT', 'DAILY_GLOBAL_LIMIT'], ['PER_VISITOR_LIMIT', 'DAILY_VISITOR_LIMIT']]) {
    const state = baseDeps({
      async reserveDailyQuota() {
        state.calls.push(['quota'])
        return { allowed: false, reason, globalCount: 50, visitorCount: 30 }
      },
    })
    const response = await handleAsk(request(), env(), {}, state.deps)
    assert.equal(response.status, 429)
    assert.deepEqual(await response.json(), { error: code })
    assert.deepEqual(state.calls.map(([name]) => name), ['hash', 'minute', 'retrieve', 'quota'])
  }
})

test('upstream setup and streaming failures retain meta and become stable error events', async () => {
  for (const streamDeepSeek of [
    async () => { throw Object.assign(new Error('raw provider secret'), { code: 'DEEPSEEK_TIMEOUT' }) },
    async () => new ReadableStream({ pull(controller) { controller.error(Object.assign(new Error('raw provider secret'), { code: 'DEEPSEEK_UNAVAILABLE' })) } }),
  ]) {
    const state = baseDeps({ streamDeepSeek })
    const output = await events(await handleAsk(request(), env(), {}, state.deps))
    assert.equal(output[0].type, 'meta')
    assert.deepEqual(output.at(-1), { type: 'error', data: { code: output.length === 2 ? output[1].data.code : output.at(-1).data.code } })
    assert.match(output.at(-1).data.code, /^DEEPSEEK_(?:TIMEOUT|UNAVAILABLE)$/)
    assert.equal(state.calls.filter(([name]) => name === 'quota').length, 1)
  }
})

test('missing secrets, IP, numeric config, and quota failures map safely', async () => {
  const cases = [
    [env({ IP_HASH_SALT: '' }), 503],
    [env({ DAILY_GLOBAL_LIMIT: 'unlimited' }), 503],
    [env({ DEEPSEEK_API_KEY: '' }), 503],
  ]
  for (const [configured, status] of cases) {
    const state = baseDeps()
    const response = await handleAsk(request(), configured, {}, state.deps)
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error: 'SERVER_MISCONFIGURED' })
  }

  const state = baseDeps({ async reserveDailyQuota() { throw new Error('private quota detail') } })
  const response = await handleAsk(request(), env(), {}, state.deps)
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: 'QUOTA_UNAVAILABLE' })
})

test('all responses and structured logs exclude request, IP, keys, source text, and raw errors', async () => {
  const state = baseDeps({ async streamDeepSeek() { throw new Error('raw provider secret') } })
  const response = await handleAsk(request(), env(), {}, state.deps)
  const serialized = `${await response.text()}\n${JSON.stringify(state.logs)}`
  for (const forbidden of [secretQuestion, secretIp, secretKey, secretText, 'raw provider secret', 'private-hmac-salt']) {
    assert.doesNotMatch(serialized, new RegExp(forbidden))
  }
  assert.deepEqual(Object.keys(state.logs[0]).sort(), ['duration', 'requestId', 'retrievalCount', 'status', 'tokenUsage'])
})

test('cancelling the client SSE stream cancels the DeepSeek stream', async () => {
  let cancelled = false
  const state = baseDeps({
    async streamDeepSeek() {
      return new ReadableStream({
        pull() { return new Promise(() => {}) },
        cancel() { cancelled = true },
      })
    },
  })
  const response = await handleAsk(request(), env(), {}, state.deps)
  const reader = response.body.getReader()
  await reader.read() // meta
  const pending = reader.read()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await reader.cancel()
  await Promise.race([pending.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 20))])
  assert.equal(cancelled, true)
})
