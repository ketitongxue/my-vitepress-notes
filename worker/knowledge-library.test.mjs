import assert from 'node:assert/strict'
import test from 'node:test'
import { createKnowledgeTreeHandler } from './knowledge-library.mjs'
import { groupLibraryDocuments } from '../docs/.vitepress/theme/components/knowledgeLibrary.mjs'

const blob = (path) => ({ path, type: 'blob', mode: '100644' })
const liveTree = () => ({
  schemaVersion: 1,
  sha: 'a'.repeat(40),
  generatedAt: '2026-09-15T00:00:00.000Z',
  truncated: false,
  tree: [blob('docs/Agent/中文 #1.html')],
})
const request = (suffix = '', options) => new Request(`https://example.com/api/knowledge/tree${suffix}`, options)
const handler = (options) => createKnowledgeTreeHandler({ getCache: () => undefined, warn: () => {}, ...options })
const freshURL = 'https://example.com/api/knowledge/tree/__published_v1/fresh'
const successURL = 'https://example.com/api/knowledge/tree/__published_v1/last-success'

function memoryCache() {
  const entries = new Map()
  const keys = []
  const writes = []
  return {
    entries, keys, writes,
    async match(key) {
      keys.push(key)
      return entries.get(key.url)?.clone()
    },
    async put(key, response) {
      writes.push(key.url)
      entries.set(key.url, response.clone())
    },
  }
}

function assertPublic(response) {
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('access-control-allow-origin'), '*')
  assert.equal(response.headers.get('access-control-allow-credentials'), null)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('x-knowledge-fetched-at'), null)
  assert.equal(response.headers.get('set-cookie'), null)
}

test('reads the published manifest from one fixed upstream without forwarding visitor credentials', async () => {
  const serve = handler({ fetchImpl: async (url, init) => {
    assert.equal(url, 'https://ketitongxue.github.io/ai-era-html-docs/docs/directory.json')
    assert.equal(init.method, 'GET')
    assert.equal(init.redirect, 'manual')
    assert.equal(init.cache, 'no-store')
    assert.deepEqual([...new Headers(init.headers)], [['accept', 'application/json'], ['cache-control', 'no-cache']])
    assert.equal(init.signal.aborted, false)
    return Response.json({ ...liveTree(), source: 'spoofed', private: 'discarded' }, {
      headers: { 'set-cookie': 'upstream=discarded', 'cache-control': 'public, max-age=14400' },
    })
  } })
  const response = await serve(request('?url=https://other.example/tree', {
    headers: { authorization: 'Bearer visitor', cookie: 'visitor=1', 'x-custom': 'visitor', origin: 'https://pages.example' },
  }))
  assert.equal(response.status, 200)
  assertPublic(response)
  const body = await response.json()
  assert.deepEqual(body, { ...liveTree(), source: 'live' })
  assert.equal(groupLibraryDocuments(body)[0].articles.length, 1)
})

test('writes two separate TTLs through waitUntil while GET and HEAD cache hits remain no-store', async () => {
  const cache = memoryCache()
  const pending = []
  let upstreamCalls = 0
  const serve = handler({
    getCache: () => cache,
    fetchImpl: async () => { upstreamCalls++; return Response.json(liveTree()) },
  })
  const first = await serve(request(), {}, { waitUntil(promise) { pending.push(promise) } })
  assertPublic(first)
  assert.equal((await first.json()).source, 'live')
  assert.equal(pending.length, 1)
  await Promise.all(pending)
  assert.equal(cache.entries.get(freshURL).headers.get('cache-control'), 'public, max-age=60')
  assert.equal(cache.entries.get(successURL).headers.get('cache-control'), 'public, max-age=604800')
  for (const suffix of ['?refresh=2', '?url=https://other.example/tree']) {
    const response = await serve(request(suffix, { headers: { cookie: 'visitor=1' } }))
    assertPublic(response)
    assert.equal((await response.json()).sha, liveTree().sha)
  }
  const head = await serve(request('?refresh=3', { method: 'HEAD' }))
  assert.equal(await head.text(), '')
  assertPublic(head)
  assert.equal(upstreamCalls, 1)
  for (const key of cache.keys) {
    assert.equal(key.url, freshURL)
    assert.equal(key.method, 'GET')
    assert.deepEqual([...key.headers], [])
  }
})

test('refresh bypasses fresh data and reflects article additions, deletions and renames with the published revision', async () => {
  const cache = memoryCache()
  let current = liveTree()
  const serve = handler({ getCache: () => cache, fetchImpl: async () => Response.json(current) })
  await serve(request())
  current = {
    ...liveTree(), sha: 'b'.repeat(40), generatedAt: '2026-09-15T01:00:00Z',
    tree: [blob('docs/Agent/renamed.html'), blob('docs/New/added.html')],
  }
  assert.equal((await (await serve(request())).json()).sha, liveTree().sha)
  const response = await serve(request('?refresh=1&url=https://untrusted.example'))
  assertPublic(response)
  assert.deepEqual(await response.json(), { ...current, source: 'live' })
  assert.deepEqual(await (await serve(request())).json(), { ...current, source: 'live' })
})

test('fresh cache expires after 60 seconds even if the cache returns an expired entry', async () => {
  const cache = memoryCache()
  let time = 100000
  let calls = 0
  const serve = handler({
    getCache: () => cache, now: () => time,
    fetchImpl: async () => { calls++; return Response.json(liveTree()) },
  })
  await serve(request())
  time += 59999
  await serve(request())
  assert.equal(calls, 1)
  time++
  await serve(request())
  assert.equal(calls, 2)
})

test('uses only the last successful manifest on failure without overwriting or extending it', async () => {
  const cache = memoryCache()
  let fail = false
  let time = 100000
  const logs = []
  const serve = handler({
    getCache: () => cache, now: () => time, warn: (entry) => logs.push(entry),
    fetchImpl: async () => fail ? new Response('upstream private detail', { status: 503 }) : Response.json(liveTree()),
  })
  await serve(request())
  fail = true
  time += 61000
  const before = await cache.entries.get(successURL).clone().text()
  const stale = await serve(request())
  assertPublic(stale)
  assert.deepEqual(await stale.json(), { ...liveTree(), source: 'stale' })
  assert.deepEqual(cache.writes, [freshURL, successURL])
  assert.equal(await cache.entries.get(successURL).clone().text(), before)
  assert.equal(cache.entries.get(successURL).headers.get('x-knowledge-fetched-at'), '100000')
  assert.deepEqual(logs, [{ event: 'knowledge_directory_upstream_failure', category: 'upstream_http', status: 503, fallback: 'last_success' }])
  time = 100000 + 7 * 24 * 60 * 60 * 1000
  const expired = await serve(request())
  assert.equal(expired.status, 503)
  assertPublic(expired)
  assert.deepEqual(await expired.json(), { error: 'KNOWLEDGE_DIRECTORY_UNAVAILABLE' })
})

test('cache eviction and the old fixed-snapshot cache cannot restore removed articles', async () => {
  const cache = memoryCache()
  cache.entries.set('https://example.com/api/knowledge/tree', Response.json({ sha: 'f'.repeat(40), source: 'snapshot' }))
  const response = await handler({ getCache: () => cache, fetchImpl: async () => new Response('', { status: 404 }) })(request())
  assert.equal(response.status, 503)
  assertPublic(response)
  assert.deepEqual(await response.json(), { error: 'KNOWLEDGE_DIRECTORY_UNAVAILABLE' })
  assert.deepEqual(cache.writes, [])
})

for (const [label, fetchImpl, category] of [
  ['redirect', async () => new Response('', { status: 302, headers: { location: 'https://other.example/directory.json' } }), 'upstream_http'],
  ['403', async () => new Response('private detail', { status: 403 }), 'upstream_http'],
  ['network failure', async () => { throw new TypeError('private detail with token') }, 'network'],
  ['non-JSON content type', async () => new Response('<html>private detail</html>'), 'content_type'],
  ['invalid JSON', async () => new Response('{', { headers: { 'content-type': 'application/json' } }), 'json'],
  ['invalid UTF-8', async () => new Response(new Uint8Array([255]), { headers: { 'content-type': 'application/json' } }), 'json'],
  ['missing tree', async () => Response.json({ message: 'unavailable' }), 'schema'],
  ['wrong schema version', async () => Response.json({ ...liveTree(), schemaVersion: 2 }), 'schema'],
  ['truncated tree', async () => Response.json({ ...liveTree(), truncated: true }), 'schema'],
  ['invalid sha', async () => Response.json({ ...liveTree(), sha: 'main' }), 'schema'],
  ['missing generated date', async () => Response.json({ ...liveTree(), generatedAt: undefined }), 'schema'],
  ['non-UTC generated date', async () => Response.json({ ...liveTree(), generatedAt: '2026-09-15T08:00:00+08:00' }), 'schema'],
  ['impossible generated date', async () => Response.json({ ...liveTree(), generatedAt: '2026-02-30T00:00:00Z' }), 'schema'],
  ['invalid tree entry', async () => Response.json({ ...liveTree(), tree: [null] }), 'schema'],
  ['symlink', async () => Response.json({ ...liveTree(), tree: [{ ...blob('docs/link.html'), mode: '120000' }] }), 'schema'],
  ['duplicate path', async () => Response.json({ ...liveTree(), tree: [...liveTree().tree, ...liveTree().tree] }), 'path'],
  ['oversized declared response', async () => Response.json(liveTree(), { headers: { 'content-length': '3000000' } }), 'response_size'],
  ['oversized streamed response', async () => new Response(' '.repeat(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'application/json' } }), 'response_size'],
  ...['index.html', 'docs/../escape.html', 'docs/invalid\\path.html', 'docs/double//path.html', 'docs/null\u0000.html', 'docs/README.md']
    .map((path) => [`unsafe article path ${JSON.stringify(path)}`, async () => Response.json({ ...liveTree(), tree: [blob(path)] }), 'path']),
]) {
  test(`${label} returns 503 without a successful cache and records only a safe category`, async () => {
    const logs = []
    const response = await handler({ fetchImpl, warn: (entry) => logs.push(entry) })(request())
    assert.equal(response.status, 503)
    assertPublic(response)
    assert.deepEqual(await response.json(), { error: 'KNOWLEDGE_DIRECTORY_UNAVAILABLE' })
    assert.equal(logs.length, 1)
    assert.equal(logs[0].category, category)
    assert.equal(logs[0].fallback, 'none')
    assert.doesNotMatch(JSON.stringify(logs), /private detail|token|visitor/)
  })
}

test('a malformed new manifest falls back to the previous successful published revision', async () => {
  const cache = memoryCache()
  let current = liveTree()
  const serve = handler({ getCache: () => cache, fetchImpl: async () => Response.json(current) })
  await serve(request())
  current = { ...current, sha: 'b'.repeat(40), truncated: true }
  const response = await serve(request('?refresh=1'))
  assert.deepEqual(await response.json(), { ...liveTree(), source: 'stale' })
  assert.equal(cache.writes.length, 2)
})

test('aborts a stalled upstream before returning an unavailable response', async () => {
  let signal
  const logs = []
  const serve = handler({
    timeoutMs: 5, warn: (entry) => logs.push(entry),
    fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
      signal = init.signal
      signal.addEventListener('abort', () => reject(new DOMException('Aborted private detail', 'AbortError')), { once: true })
    }),
  })
  const response = await serve(request())
  assert.equal(signal.aborted, true)
  assert.equal(response.status, 503)
  assert.deepEqual(logs, [{ event: 'knowledge_directory_upstream_failure', category: 'timeout', fallback: 'none' }])
})

for (const operation of ['get', 'match', 'put']) {
  test(`cache ${operation} failures do not prevent a live response`, async () => {
    const cache = memoryCache()
    if (operation !== 'get') cache[operation] = () => { throw new Error('Cache unavailable') }
    const serve = handler({
      getCache: () => { if (operation === 'get') throw new Error('Cache unavailable'); return cache },
      fetchImpl: async () => Response.json(liveTree()),
    })
    const response = await serve(request())
    assertPublic(response)
    assert.equal((await response.json()).source, 'live')
  })
}

test('rejected background cache writes are handled by waitUntil', async () => {
  const pending = []
  const serve = handler({
    getCache: () => ({ match: async () => undefined, put: async () => { throw new Error('Cache full') } }),
    fetchImpl: async () => Response.json(liveTree()),
  })
  const response = await serve(request(), {}, { waitUntil(promise) { pending.push(promise) } })
  assert.equal((await response.json()).source, 'live')
  await assert.doesNotReject(Promise.all(pending))
})

test('corrupt cached data is discarded and the published directory is fetched', async () => {
  const cache = memoryCache()
  cache.entries.set(freshURL, Response.json({ ...liveTree(), tree: [null] }, {
    headers: { 'x-knowledge-fetched-at': String(Date.now()) },
  }))
  const response = await handler({ getCache: () => cache, fetchImpl: async () => Response.json(liveTree()) })(request())
  assertPublic(response)
  assert.deepEqual(await response.json(), { ...liveTree(), source: 'live' })
})

test('HEAD cache misses populate a reusable GET response and errors still have no body', async () => {
  const cache = memoryCache()
  let calls = 0
  const serve = handler({ getCache: () => cache, fetchImpl: async () => { calls++; return Response.json(liveTree()) } })
  const head = await serve(request('', { method: 'HEAD' }))
  assertPublic(head)
  assert.equal(await head.text(), '')
  assert.equal((await (await serve(request())).json()).source, 'live')
  assert.equal(calls, 1)
  const unavailable = await handler({ fetchImpl: async () => new Response('', { status: 503 }) })(request('', { method: 'HEAD' }))
  assertPublic(unavailable)
  assert.equal(unavailable.status, 503)
  assert.equal(await unavailable.text(), '')
})

test('allows genuinely empty directories without restoring removed articles', async () => {
  const response = await handler({ fetchImpl: async () => Response.json({ ...liveTree(), tree: [] }) })(request())
  assert.deepEqual(await response.json(), { ...liveTree(), tree: [], source: 'live' })
})

test('answers CORS preflight without accessing the cache or upstream', async () => {
  const serve = handler({ getCache: assert.fail, fetchImpl: assert.fail })
  const response = await serve(request('', { method: 'OPTIONS', headers: { origin: 'https://pages.example', 'access-control-request-method': 'GET' } }))
  assert.equal(response.status, 204)
  assertPublic(response)
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, HEAD, OPTIONS')
  assert.equal(await response.text(), '')
})

test('rejects unsupported methods before accessing the cache or upstream', async () => {
  const serve = handler({ getCache: assert.fail, fetchImpl: assert.fail })
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const response = await serve(request('', { method }))
    assert.equal(response.status, 405)
    assert.equal(response.headers.get('allow'), 'GET, HEAD, OPTIONS')
    assertPublic(response)
  }
})
