import assert from 'node:assert/strict'
import test from 'node:test'

import { checkMinuteLimit, hashVisitor, jsonError } from './security.mjs'

test('hashVisitor uses keyed HMAC deterministically without exposing the IP', async () => {
  const ip = '203.0.113.42'
  const first = await hashVisitor(ip, 'a strong deployment secret')
  const second = await hashVisitor(ip, 'a strong deployment secret')
  const otherSalt = await hashVisitor(ip, 'another secret')

  assert.equal(first, second)
  assert.notEqual(first, otherSalt)
  assert.match(first, /^[a-f0-9]{64}$/)
  assert.equal(first.includes(ip), false)
})

test('hashVisitor refuses missing or blank salt and IP', async () => {
  await assert.rejects(() => hashVisitor('203.0.113.42'), { code: 'SERVER_MISCONFIGURED' })
  await assert.rejects(() => hashVisitor('203.0.113.42', '   '), { code: 'SERVER_MISCONFIGURED' })
  await assert.rejects(() => hashVisitor('', 'secret'), { code: 'INVALID_VISITOR' })
})

test('jsonError creates a stable JSON no-store response', async () => {
  const response = jsonError('INVALID_QUESTION', 400)
  assert.equal(response.status, 400)
  assert.match(response.headers.get('content-type'), /^application\/json\b/)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { error: 'INVALID_QUESTION' })
})

test('checkMinuteLimit calls the binding exactly once with the visitor key', async () => {
  const calls = []
  const result = await checkMinuteLimit({
    QA_RATE_LIMITER: {
      async limit(argument) {
        calls.push(argument)
        return { success: true }
      },
    },
  }, 'anonymous-key')

  assert.deepEqual(calls, [{ key: 'anonymous-key' }])
  assert.deepEqual(result, { ok: true })
})

test('checkMinuteLimit maps denial to RATE_LIMITED_MINUTE', async () => {
  const result = await checkMinuteLimit({
    QA_RATE_LIMITER: { async limit() { return { success: false } } },
  }, 'anonymous-key')

  assert.equal(result.ok, false)
  assert.equal(result.response.status, 429)
  assert.deepEqual(await result.response.json(), { error: 'RATE_LIMITED_MINUTE' })
})

test('checkMinuteLimit handles absent, invalid, or failing bindings safely', async () => {
  for (const env of [{}, { QA_RATE_LIMITER: {} }, {
    QA_RATE_LIMITER: { async limit() { throw new Error('binding unavailable') } },
  }]) {
    const result = await checkMinuteLimit(env, 'anonymous-key')
    assert.equal(result.ok, false)
    assert.equal(result.response.status, 503)
    assert.deepEqual(await result.response.json(), { error: 'SERVER_MISCONFIGURED' })
  }
})
