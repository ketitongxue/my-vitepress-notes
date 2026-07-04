import assert from 'node:assert/strict'
import test from 'node:test'

import { MAX_REQUEST_BYTES, validateAskRequest } from './request.mjs'

const ORIGIN = 'https://juzxailab.com'

function request(body, options = {}) {
  const headers = new Headers(options.headers)
  if (!headers.has('content-type')) headers.set('content-type', 'application/json')
  if (!headers.has('origin')) headers.set('origin', ORIGIN)
  return new Request('https://juzxailab.com/api/ask', {
    method: options.method ?? 'POST',
    headers,
    body: typeof body === 'string' || ArrayBuffer.isView(body) ? body : JSON.stringify(body),
  })
}

async function expectError(input, code, status = 400) {
  const result = await validateAskRequest(input, ORIGIN)
  assert.equal(result.ok, false)
  assert.equal(result.response.status, status)
  assert.deepEqual(await result.response.json(), { error: code })
  assert.equal(result.response.headers.get('cache-control'), 'no-store')
}

test('accepts and normalizes a valid same-site request', async () => {
  const result = await validateAskRequest(request({
    question: '  什么是 Transformer？  ',
    history: [
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '你好，有什么问题？' },
    ],
  }), ORIGIN)

  assert.deepEqual(result, {
    ok: true,
    data: {
      question: '什么是 Transformer？',
      history: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好，有什么问题？' },
      ],
    },
  })
})

test('history is optional and defaults to an empty list', async () => {
  const result = await validateAskRequest(request({ question: '问题' }), ORIGIN)
  assert.deepEqual(result, { ok: true, data: { question: '问题', history: [] } })
})

test('rejects non-POST, non-JSON, absent or non-exact Origin', async () => {
  await expectError(request({ question: 'x' }, { method: 'PUT' }), 'METHOD_NOT_ALLOWED', 405)
  await expectError(request({ question: 'x' }, { headers: { 'content-type': 'text/plain' } }), 'UNSUPPORTED_MEDIA_TYPE', 415)
  await expectError(request({ question: 'x' }, { headers: { origin: 'https://www.juzxailab.com' } }), 'INVALID_ORIGIN', 403)
  await expectError(request({ question: 'x' }, { headers: { origin: '' } }), 'INVALID_ORIGIN', 403)
})

test('accepts application/json with parameters', async () => {
  for (const contentType of [
    'application/json; charset=utf-8',
    ' Application/JSON ; charset = "utf-8" ',
    'application/json; profile="https://example.com/a;b"; charset=UTF-8',
  ]) {
    const result = await validateAskRequest(request({ question: 'x' }, {
      headers: { 'content-type': contentType },
    }), ORIGIN)
    assert.equal(result.ok, true, contentType)
  }
})

test('rejects malformed or trailing Content-Type data', async () => {
  for (const contentType of [
    'application/json; text/plain',
    'application/json;; charset=utf-8',
    'application/json;',
    'application/json; charset=utf-8 text/plain',
    'application/json; charset="utf-8',
    'application/json, text/plain',
  ]) {
    await expectError(request({ question: 'x' }, {
      headers: { 'content-type': contentType },
    }), 'UNSUPPORTED_MEDIA_TYPE', 415)
  }
})

test('rejects malformed JSON, arrays, null and unknown top-level fields', async () => {
  await expectError(request('{'), 'INVALID_JSON')
  await expectError(request('[]'), 'INVALID_BODY')
  await expectError(request('null'), 'INVALID_BODY')
  await expectError(request({ question: 'x', extra: true }), 'UNKNOWN_FIELD')
})

test('question must be a trimmed non-empty string of at most 500 characters', async () => {
  await expectError(request({ question: 3 }), 'INVALID_QUESTION')
  await expectError(request({ question: '   ' }), 'INVALID_QUESTION')
  await expectError(request({ question: '问'.repeat(501) }), 'QUESTION_TOO_LONG')
  const result = await validateAskRequest(request({ question: '问'.repeat(500) }), ORIGIN)
  assert.equal(result.ok, true)
})

test('history has at most 6 well-shaped user or assistant messages', async () => {
  await expectError(request({ question: 'x', history: null }), 'INVALID_HISTORY')
  await expectError(request({ question: 'x', history: Array(7).fill({ role: 'user', content: 'x' }) }), 'HISTORY_TOO_LONG')
  await expectError(request({ question: 'x', history: [{ role: 'system', content: 'x' }] }), 'INVALID_HISTORY')
  await expectError(request({ question: 'x', history: [{ role: 'user', content: 1 }] }), 'INVALID_HISTORY')
  await expectError(request({ question: 'x', history: [{ role: 'user', content: 'x', extra: true }] }), 'INVALID_HISTORY')
})

test('history aggregate content is limited to 6,000 characters', async () => {
  const accepted = await validateAskRequest(request({
    question: 'x',
    history: [{ role: 'user', content: '历'.repeat(6000) }],
  }), ORIGIN)
  assert.equal(accepted.ok, true)
  await expectError(request({
    question: 'x',
    history: [{ role: 'user', content: '历'.repeat(6001) }],
  }), 'HISTORY_CONTENT_TOO_LONG')
})

test('rejects a declared or actual request body over the byte cap', async () => {
  await expectError(request('{"question":"x"}', {
    headers: { 'content-length': String(MAX_REQUEST_BYTES + 1) },
  }), 'REQUEST_TOO_LARGE', 413)

  const oversized = JSON.stringify({ question: 'x', padding: 'a'.repeat(MAX_REQUEST_BYTES) })
  await expectError(request(oversized), 'REQUEST_TOO_LARGE', 413)
})

test('rejects malformed UTF-8 as INVALID_JSON instead of accepting replacement text', async () => {
  const prefix = new TextEncoder().encode('{"question":"')
  const suffix = new TextEncoder().encode('"}')
  const bytes = new Uint8Array(prefix.length + 2 + suffix.length)
  bytes.set(prefix)
  bytes.set([0xc3, 0x28], prefix.length)
  bytes.set(suffix, prefix.length + 2)

  await expectError(request(bytes), 'INVALID_JSON')
})

test('an oversized body stays a stable 413 when stream cancellation rejects', async () => {
  let sent = false
  const body = new ReadableStream({
    pull(controller) {
      if (!sent) {
        sent = true
        controller.enqueue(new Uint8Array(MAX_REQUEST_BYTES + 1))
      }
    },
    cancel() {
      throw new Error('cancel details must not escape')
    },
  })
  const input = new Request('https://juzxailab.com/api/ask', {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json' },
    body,
    duplex: 'half',
  })

  await expectError(input, 'REQUEST_TOO_LARGE', 413)
})

test('a body stream read failure maps to a stable safe error', async () => {
  const body = new ReadableStream({
    pull(controller) {
      controller.error(new Error('private upstream read detail'))
    },
  })
  const input = new Request('https://juzxailab.com/api/ask', {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json' },
    body,
    duplex: 'half',
  })

  await expectError(input, 'INVALID_JSON')
})

test('rejects non-canonical Content-Length declarations', async () => {
  for (const contentLength of ['-1', 'abc', '1, 2', '1.5', '+1', '01', '1 2', ' 1 ']) {
    const base = request({ question: 'x' })
    const input = {
      method: base.method,
      body: base.body,
      headers: {
        get(name) {
          if (name.toLowerCase() === 'content-length') return contentLength
          return base.headers.get(name)
        },
      },
    }
    await expectError(input, 'INVALID_CONTENT_LENGTH')
  }
})

test('accepts canonical nonnegative decimal Content-Length', async () => {
  for (const contentLength of ['0', '1', String(MAX_REQUEST_BYTES)]) {
    const base = request({ question: 'x' })
    const input = {
      method: base.method,
      body: base.body,
      headers: {
        get(name) {
          if (name.toLowerCase() === 'content-length') return contentLength
          return base.headers.get(name)
        },
      },
    }
    const result = await validateAskRequest(input, ORIGIN)
    assert.equal(result.ok, true, contentLength)
  }
})
