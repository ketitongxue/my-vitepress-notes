import assert from 'node:assert/strict'
import test from 'node:test'
import { createKnowledgeTreeHandler } from './knowledge-library.mjs'
import { knowledgeLibrarySnapshot } from './knowledge-library-snapshot.mjs'
import { groupLibraryDocuments } from '../docs/.vitepress/theme/components/knowledgeLibrary.mjs'

const blob = (path) => ({ path, type: 'blob', mode: '100644' })
const liveTree = () => ({ sha: 'a'.repeat(40), truncated: false, tree: [blob('docs/Agent/中文 #1.html')] })
const request = (suffix = '', options) => new Request(`https://example.com/api/knowledge/tree${suffix}`, options)
const handler = (options) => createKnowledgeTreeHandler({ getCache: () => undefined, ...options })

function memoryCache() {
  const entries = new Map()
  const keys = []
  return {
    keys,
    async match(key) {
      keys.push(key)
      return entries.get(key.url)?.clone()
    },
    async put(key, response) {
      entries.set(key.url, response.clone())
    },
  }
}

test('serves a compatible filtered tree from a fixed upstream without visitor credentials', async () => {
  const tree = liveTree()
  tree.tree.push(
    blob('assets/diagram.png'), blob('index.html'), blob('docs/../escape.html'),
    { ...blob('docs/link.html'), mode: '120000' }, blob('docs/Agent/中文 #1.html'),
    blob('docs/invalid\\path.html'), blob('docs/double//path.html'),
  )
  const serve = handler({ fetchImpl: async (url, init) => {
    assert.equal(url, 'https://api.github.com/repos/ketitongxue/ai-era-html-docs/git/trees/main?recursive=1')
    assert.equal(init.method, 'GET')
    assert.equal(init.redirect, 'error')
    const headers = new Headers(init.headers)
    assert.equal(headers.get('accept'), 'application/vnd.github+json')
    assert.match(headers.get('user-agent'), /knowledge-directory/)
    assert.equal(headers.get('authorization'), null)
    assert.equal(headers.get('cookie'), null)
    assert.equal(headers.get('x-custom'), null)
    assert.equal(init.signal.aborted, false)
    return Response.json(tree)
  } })
  const response = await serve(request('?url=https://other.example/tree', {
    headers: { authorization: 'Bearer visitor', cookie: 'visitor=1', 'x-custom': 'visitor' },
  }))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300')
  const body = await response.json()
  assert.deepEqual(body, { ...liveTree(), source: 'live' })
  assert.equal(groupLibraryDocuments(body)[0].articles.length, 1)
})

test('uses one cache key for query variants and HEAD, writing through waitUntil', async () => {
  const cache = memoryCache()
  const pending = []
  let upstreamCalls = 0
  const serve = handler({
    getCache: () => cache,
    fetchImpl: async () => { upstreamCalls++; return Response.json(liveTree()) },
  })
  const first = await serve(request('?refresh=1'), {}, { waitUntil(promise) { pending.push(promise) } })
  assert.equal((await first.json()).source, 'live')
  assert.equal(pending.length, 1)
  await Promise.all(pending)
  const second = await serve(request('?refresh=2', { headers: { cookie: 'visitor=1' } }))
  assert.equal((await second.json()).sha, liveTree().sha)
  const head = await serve(request('?refresh=3', { method: 'HEAD' }))
  assert.equal(await head.text(), '')
  assert.equal(head.headers.get('cache-control'), 'public, max-age=300')
  assert.equal(upstreamCalls, 1)
  for (const key of cache.keys) {
    assert.equal(key.url, 'https://example.com/api/knowledge/tree')
    assert.equal(key.method, 'GET')
    assert.deepEqual([...key.headers], [])
  }
})

for (const [label, fetchImpl] of [
  ['403', async () => new Response('rate limited', { status: 403 })],
  ['429', async () => new Response('rate limited', { status: 429 })],
  ['network failure', async () => { throw new TypeError('fetch failed') }],
  ['invalid JSON', async () => new Response('<html>Unavailable</html>')],
  ['missing tree', async () => Response.json({ message: 'unavailable' })],
  ['truncated tree', async () => Response.json({ ...liveTree(), truncated: true })],
  ['invalid tree entry', async () => Response.json({ ...liveTree(), tree: [null] })],
  ['oversized declared response', async () => new Response('{}', { headers: { 'content-length': '3000000' } })],
  ['oversized streamed response', async () => new Response(' '.repeat(2 * 1024 * 1024 + 1))],
]) {
  test(`${label} serves the verified snapshot with short caching`, async () => {
    const response = await handler({ fetchImpl })(request())
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'public, max-age=60')
    assert.deepEqual(await response.json(), { ...knowledgeLibrarySnapshot, source: 'snapshot' })
  })
}

test('aborts a stalled upstream before serving the snapshot', async () => {
  let signal
  const serve = handler({
    timeoutMs: 5,
    fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
      signal = init.signal
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }),
  })
  const response = await serve(request())
  assert.equal(signal.aborted, true)
  assert.equal((await response.json()).source, 'snapshot')
})

for (const operation of ['get', 'match', 'put']) {
  test(`cache ${operation} failures do not prevent a live response`, async () => {
    const cache = memoryCache()
    if (operation !== 'get') cache[operation] = () => { throw new Error('Cache unavailable') }
    const serve = handler({
      getCache: () => { if (operation === 'get') throw new Error('Cache unavailable'); return cache },
      fetchImpl: async () => Response.json(liveTree()),
    })
    assert.equal((await (await serve(request())).json()).source, 'live')
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

test('HEAD cache misses populate a reusable GET response', async () => {
  const cache = memoryCache()
  let calls = 0
  const serve = handler({ getCache: () => cache, fetchImpl: async () => { calls++; return Response.json(liveTree()) } })
  assert.equal(await (await serve(request('', { method: 'HEAD' }))).text(), '')
  assert.equal((await (await serve(request())).json()).source, 'live')
  assert.equal(calls, 1)
})

test('allows genuinely empty repositories without restoring removed articles', async () => {
  const response = await handler({ fetchImpl: async () => Response.json({ ...liveTree(), tree: [] }) })(request())
  assert.deepEqual(await response.json(), { ...liveTree(), tree: [], source: 'live' })
})

test('rejects unsupported methods before accessing the cache or upstream', async () => {
  const serve = handler({ getCache: assert.fail, fetchImpl: assert.fail })
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const response = await serve(request('', { method }))
    assert.equal(response.status, 405)
    assert.equal(response.headers.get('allow'), 'GET, HEAD')
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
})

test('fallback records the verified revision and only public HTML article paths', () => {
  assert.equal(knowledgeLibrarySnapshot.sha, 'f84c004461d60fd8bf6fa14f689fc53947d861f4')
  assert.equal(knowledgeLibrarySnapshot.capturedOn, '2026-09-12')
  assert.equal(knowledgeLibrarySnapshot.truncated, false)
  assert.equal(knowledgeLibrarySnapshot.tree.length, 10)
  const groups = groupLibraryDocuments(knowledgeLibrarySnapshot)
  assert.equal(groups.reduce((total, group) => total + group.articles.length, 0), 10)
  for (const item of knowledgeLibrarySnapshot.tree) {
    assert.equal(item.type, 'blob')
    assert.equal(item.mode, '100644')
    assert.match(item.path, /^docs\/.+\.html$/)
  }
})
