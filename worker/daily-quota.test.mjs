import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { DailyQuota as ExportedDailyQuota } from './index.mjs'
import {
  DailyQuota,
  reserveDailyQuota,
  reserveQuota,
} from './daily-quota.mjs'

class Mutex {
  #tail = Promise.resolve()

  async run(callback) {
    const previous = this.#tail
    let release
    this.#tail = new Promise((resolve) => { release = resolve })
    await previous
    try {
      return await callback()
    } finally {
      release()
    }
  }
}

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial))
    this.mutex = new Mutex()
    this.transactionCount = 0
  }

  get(key) {
    return Promise.resolve(this.values.get(key))
  }

  transaction(callback) {
    return this.mutex.run(async () => {
      this.transactionCount += 1
      const snapshot = new Map(this.values)
      const txn = {
        get: (key) => Promise.resolve(snapshot.get(key)),
        put: async (keyOrEntries, value) => {
          if (typeof keyOrEntries === 'string') snapshot.set(keyOrEntries, value)
          else for (const [key, entry] of Object.entries(keyOrEntries)) snapshot.set(key, entry)
        },
        list: async ({ prefix }) => new Map(
          [...snapshot].filter(([key]) => key.startsWith(prefix)),
        ),
        delete: async (keys) => {
          for (const key of Array.isArray(keys) ? keys : [keys]) snapshot.delete(key)
        },
      }
      const result = await callback(txn)
      this.values = snapshot
      return result
    })
  }
}

const date = '2026-07-04'
const visitorKey = 'a'.repeat(64)

function input(overrides = {}) {
  return {
    date,
    visitorKey,
    perVisitorLimit: 30,
    globalLimit: 50,
    ...overrides,
  }
}

test('Worker exports DailyQuota and Wrangler configures its SQLite namespace', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url)))

  assert.equal(ExportedDailyQuota, DailyQuota)
  assert.deepEqual(config.durable_objects, {
    bindings: [{ name: 'QA_QUOTA', class_name: 'DailyQuota' }],
  })
  assert.deepEqual(config.migrations, [{
    tag: 'v1',
    new_sqlite_classes: ['DailyQuota'],
  }])
})

test('allows 30 reservations for one visitor and rejects the 31st without incrementing', async () => {
  const storage = new MemoryStorage()

  const results = []
  for (let i = 0; i < 31; i += 1) results.push(await reserveQuota(storage, input()))

  assert.equal(results.filter((result) => result.allowed).length, 30)
  assert.deepEqual(results.at(-1), {
    allowed: false,
    reason: 'PER_VISITOR_LIMIT',
    globalCount: 30,
    visitorCount: 30,
  })
  assert.equal(await storage.get('globalCount'), 30)
  assert.equal(await storage.get(`visitor/${visitorKey}`), 30)
  assert.equal(storage.transactionCount, 31)
})

test('allows 50 global reservations and rejects the 51st without incrementing', async () => {
  const storage = new MemoryStorage()
  let last

  for (let i = 0; i < 51; i += 1) {
    last = await reserveQuota(storage, input({ visitorKey: i.toString(16).padStart(64, '0') }))
  }

  assert.deepEqual(last, {
    allowed: false,
    reason: 'GLOBAL_LIMIT',
    globalCount: 50,
    visitorCount: 0,
  })
  assert.equal(await storage.get('globalCount'), 50)
})

test('global reservations never exceed 50 under concurrency', async () => {
  const storage = new MemoryStorage({ date, globalCount: 40 })
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    reserveQuota(storage, input({ visitorKey: i.toString(16).padStart(64, '0') }))))

  assert.equal(results.filter((result) => result.allowed).length, 10)
  assert.equal(await storage.get('globalCount'), 50)
})

test('a new UTC date resets global and visitor counters', async () => {
  const storage = new MemoryStorage({
    date: '2026-07-03',
    globalCount: 50,
    [`visitor/${visitorKey}`]: 30,
    'visitor/stale': 9,
  })

  const result = await reserveQuota(storage, input())

  assert.deepEqual(result, {
    allowed: true,
    globalCount: 1,
    visitorCount: 1,
  })
  assert.equal(await storage.get('date'), date)
  assert.equal(await storage.get('globalCount'), 1)
  assert.equal(await storage.get(`visitor/${visitorKey}`), 1)
  assert.equal(await storage.get('visitor/stale'), undefined)
})

test('DailyQuota accepts only a valid internal POST /reserve request', async () => {
  const quota = new DailyQuota({ storage: new MemoryStorage() }, {})
  const response = await quota.fetch(new Request('https://quota.internal/reserve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input()),
  }))

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    allowed: true,
    globalCount: 1,
    visitorCount: 1,
  })
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('DailyQuota accepts complete valid application/json Content-Type values', async () => {
  const contentTypes = [
    'application/json; charset=utf-8',
    'Application/JSON ; charset="utf-8"; profile="quota\\\"v1"',
  ]

  for (const contentType of contentTypes) {
    const quota = new DailyQuota({ storage: new MemoryStorage() }, {})
    const response = await quota.fetch(new Request('https://quota.internal/reserve', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: JSON.stringify(input()),
    }))
    assert.equal(response.status, 200, contentType)
  }
})

test('DailyQuota rejects ambiguous or malformed application/json Content-Type values', async () => {
  const contentTypes = [
    'application/json; text/plain',
    'application/json;',
    'application/json;;charset=utf-8',
    'application/json, text/plain',
    'application/json; charset',
    'application/json; charset="unterminated',
  ]

  for (const contentType of contentTypes) {
    const quota = new DailyQuota({ storage: new MemoryStorage() }, {})
    const response = await quota.fetch(new Request('https://quota.internal/reserve', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: JSON.stringify(input()),
    }))
    assert.equal(response.status, 415, contentType)
    assert.deepEqual(await response.json(), { error: 'UNSUPPORTED_MEDIA_TYPE' })
  }
})

test('DailyQuota rejects invalid methods, paths, media types, bodies, and secret-like fields', async () => {
  const requests = [
    [new Request('https://quota.internal/reserve'), 405, 'METHOD_NOT_ALLOWED'],
    [new Request('https://quota.internal/missing', { method: 'POST' }), 404, 'NOT_FOUND'],
    [new Request('https://quota.internal/reserve', { method: 'POST', body: '{}' }), 415, 'UNSUPPORTED_MEDIA_TYPE'],
    [new Request('https://quota.internal/reserve', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
    }), 400, 'INVALID_JSON'],
    [new Request('https://quota.internal/reserve', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input({ apiKey: 'should-not-be-here' })),
    }), 400, 'INVALID_BODY'],
    [new Request('https://quota.internal/reserve', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input({ date: '2026-02-30' })),
    }), 400, 'INVALID_BODY'],
    [new Request('https://quota.internal/reserve', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input({ visitorKey: 'raw-ip-address' })),
    }), 400, 'INVALID_BODY'],
  ]

  for (const [request, status, error] of requests) {
    const quota = new DailyQuota({ storage: new MemoryStorage() }, {})
    const response = await quota.fetch(request)
    assert.equal(response.status, status)
    assert.deepEqual(await response.json(), { error })
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
})

test('reserveDailyQuota always targets the global singleton and rejects unsafe responses', async () => {
  const calls = []
  const env = {
    QA_QUOTA: {
      idFromName(name) {
        calls.push(['idFromName', name])
        return 'global-id'
      },
      get(id) {
        calls.push(['get', id])
        return {
          async fetch(request) {
            calls.push(['fetch', new URL(request.url).pathname])
            return Response.json({ allowed: true, globalCount: 1, visitorCount: 1 })
          },
        }
      },
    },
  }

  assert.deepEqual(await reserveDailyQuota(env, input()), {
    allowed: true,
    globalCount: 1,
    visitorCount: 1,
  })
  assert.deepEqual(calls, [
    ['idFromName', 'global'],
    ['get', 'global-id'],
    ['fetch', '/reserve'],
  ])

  env.QA_QUOTA.get = () => ({ fetch: async () => Response.json({ allowed: true, apiKey: 'leak' }) })
  await assert.rejects(() => reserveDailyQuota(env, input()), /INVALID_QUOTA_RESPONSE/)
})
