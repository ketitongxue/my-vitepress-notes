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
    this.listCount = 0
    this.deleteCount = 0
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
        list: async ({ prefix }) => {
          this.listCount += 1
          return new Map([...snapshot].filter(([key]) => key.startsWith(prefix)))
        },
        delete: async (keys) => {
          this.deleteCount += 1
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

function requestInput(overrides = {}) {
  const { date: _date, ...request } = input(overrides)
  return request
}

function makeQuota(storage = new MemoryStorage(), now = `${date}T12:00:00.000Z`) {
  return new DailyQuota({ storage }, {}, () => new Date(now))
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
  assert.equal(await storage.get(`visitor/${date}/${visitorKey}`), 30)
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
  const storage = new MemoryStorage({
    date,
    globalCount: 40,
    [`visitor/${date}/${'a'.repeat(64)}`]: 30,
    [`visitor/${date}/${'b'.repeat(64)}`]: 10,
  })
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    reserveQuota(storage, input({ visitorKey: i.toString(16).padStart(64, '0') }))))

  assert.equal(results.filter((result) => result.allowed).length, 10)
  assert.equal(await storage.get('globalCount'), 50)
})

test('a new UTC date resets global and visitor counters', async () => {
  const storage = new MemoryStorage({
    date: '2026-07-03',
    globalCount: 50,
    [`visitor/2026-07-03/${visitorKey}`]: 30,
    [`visitor/2026-07-03/${'b'.repeat(64)}`]: 20,
  })

  const result = await reserveQuota(storage, input())

  assert.deepEqual(result, {
    allowed: true,
    globalCount: 1,
    visitorCount: 1,
  })
  assert.equal(await storage.get('date'), date)
  assert.equal(await storage.get('globalCount'), 1)
  assert.equal(await storage.get(`visitor/${date}/${visitorKey}`), 1)
  assert.equal(await storage.get(`visitor/2026-07-03/${'b'.repeat(64)}`), 20)
})

test('reserve and rollover never scan or bulk-delete visitor state', async () => {
  const oldDate = '2026-07-03'
  const oldVisitorKey = `visitor/${oldDate}/${visitorKey}`
  const storage = new MemoryStorage({
    date: oldDate,
    globalCount: 30,
    [oldVisitorKey]: 30,
  })

  const result = await reserveQuota(storage, input())
  const sameDayResult = await reserveQuota(storage, input())

  assert.deepEqual(result, { allowed: true, globalCount: 1, visitorCount: 1 })
  assert.deepEqual(sameDayResult, { allowed: true, globalCount: 2, visitorCount: 2 })
  assert.equal(storage.listCount, 0)
  assert.equal(storage.deleteCount, 0)
  assert.equal(await storage.get(oldVisitorKey), 30)
  assert.equal(await storage.get(`visitor/${date}/${visitorKey}`), 2)
})

test('an out-of-order pre-midnight reservation cannot roll state back after rollover', async () => {
  const storage = new MemoryStorage({
    date: '2026-07-04',
    globalCount: 1,
    [`visitor/2026-07-04/${visitorKey}`]: 1,
  })

  const [afterMidnight, stale] = await Promise.all([
    reserveQuota(storage, input({ date: '2026-07-05', visitorKey: 'b'.repeat(64) })),
    reserveQuota(storage, input({ date: '2026-07-04' })),
  ])

  assert.deepEqual(afterMidnight, { allowed: true, globalCount: 1, visitorCount: 1 })
  assert.deepEqual(stale, {
    allowed: false,
    reason: 'STALE_DATE',
    globalCount: 1,
    visitorCount: 0,
  })
  assert.equal(await storage.get('date'), '2026-07-05')
  assert.equal(await storage.get('globalCount'), 1)
  assert.equal(await storage.get(`visitor/2026-07-04/${visitorKey}`), 1)
})

test('corrupt persisted quota state fails closed without mutation', async () => {
  const cases = [
    { date, globalCount: '1' },
    { date, globalCount: -1 },
    { date, globalCount: Number.MAX_SAFE_INTEGER + 1 },
    { date: 'not-a-date', globalCount: 0 },
    { globalCount: 0 },
    { date, globalCount: 1, [`visitor/${date}/${visitorKey}`]: '1' },
    { date, globalCount: 1, [`visitor/${date}/${visitorKey}`]: -1 },
    { date, globalCount: 1, [`visitor/${date}/${visitorKey}`]: 2 },
    { [`visitor/${date}/${visitorKey}`]: 1 },
  ]

  for (const state of cases) {
    const storage = new MemoryStorage(state)
    const before = new Map(storage.values)
    await assert.rejects(() => reserveQuota(storage, input()), /CORRUPT_QUOTA_STATE/)
    assert.deepEqual(storage.values, before)
  }
})

test('DailyQuota accepts only a valid internal POST /reserve request', async () => {
  const quota = makeQuota()
  const response = await quota.fetch(new Request('https://quota.internal/reserve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestInput()),
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
    const quota = makeQuota()
    const response = await quota.fetch(new Request('https://quota.internal/reserve', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: JSON.stringify(requestInput()),
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
    const quota = makeQuota()
    const response = await quota.fetch(new Request('https://quota.internal/reserve', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: JSON.stringify(requestInput()),
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
      body: JSON.stringify(requestInput({ apiKey: 'should-not-be-here' })),
    }), 400, 'INVALID_BODY'],
    [new Request('https://quota.internal/reserve', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...requestInput(), date: '2026-02-30' }),
    }), 400, 'INVALID_BODY'],
    [new Request('https://quota.internal/reserve', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requestInput({ visitorKey: 'raw-ip-address' })),
    }), 400, 'INVALID_BODY'],
  ]

  for (const [request, status, error] of requests) {
    const quota = makeQuota()
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

  assert.deepEqual(await reserveDailyQuota(env, requestInput()), {
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
  await assert.rejects(() => reserveDailyQuota(env, requestInput()), /INVALID_QUOTA_RESPONSE/)
})

test('reserveDailyQuota rejects impossible or corrupt responses against requested limits', async () => {
  const responses = [
    { allowed: true, globalCount: 51, visitorCount: 1 },
    { allowed: true, globalCount: 1, visitorCount: 31 },
    { allowed: true, globalCount: 1, visitorCount: 2 },
    { allowed: false, reason: 'GLOBAL_LIMIT', globalCount: 49, visitorCount: 1 },
    { allowed: false, reason: 'PER_VISITOR_LIMIT', globalCount: 50, visitorCount: 30 },
    { allowed: false, reason: 'PER_VISITOR_LIMIT', globalCount: 29, visitorCount: 29 },
    { allowed: false, reason: 'STALE_DATE', globalCount: -1, visitorCount: 0 },
  ]

  for (const body of responses) {
    const env = {
      QA_QUOTA: {
        idFromName: () => 'global-id',
        get: () => ({ fetch: async () => Response.json(body) }),
      },
    }
    await assert.rejects(
      () => reserveDailyQuota(env, requestInput()),
      /INVALID_QUOTA_RESPONSE/,
      JSON.stringify(body),
    )
  }
})

test('DailyQuota derives UTC date from its clock and never accepts a caller-supplied date', async () => {
  const storage = new MemoryStorage()
  const quota = makeQuota(storage, '2026-07-05T00:00:00.001Z')
  const accepted = await quota.fetch(new Request('https://quota.internal/reserve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestInput()),
  }))
  assert.equal(accepted.status, 200)
  assert.equal(await storage.get('date'), '2026-07-05')

  const rejected = await quota.fetch(new Request('https://quota.internal/reserve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input()),
  }))
  assert.equal(rejected.status, 400)
  assert.deepEqual(await rejected.json(), { error: 'INVALID_BODY' })
})
