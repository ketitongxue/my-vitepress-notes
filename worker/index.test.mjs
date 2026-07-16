import assert from 'node:assert/strict'
import test from 'node:test'

import worker, { createWorker } from './index.mjs'

function makeEnv(assetResponse = new Response('asset')) {
  const calls = []
  return {
    calls,
    env: {
      ASSETS: {
        fetch(request) {
          calls.push(request)
          return assetResponse
        },
      },
    },
  }
}

test('POST /api/ask is routed to the injected ask handler with no-store', async () => {
  const request = new Request('https://example.com/api/ask', { method: 'POST' })
  const expected = new Response(JSON.stringify({ answer: 'hello' }), {
    headers: { 'content-type': 'application/json' },
  })
  const calls = []
  const worker = createWorker({
    askHandler(receivedRequest, env, ctx) {
      calls.push({ receivedRequest, env, ctx })
      return expected
    },
  })
  const env = { ASSETS: { fetch: assert.fail } }
  const ctx = { waitUntil() {} }

  const response = await worker.fetch(request, env, ctx)

  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], { receivedRequest: request, env, ctx })
  assert.equal(await response.json().then(({ answer }) => answer), 'hello')
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('non-POST /api/ask is an unknown API route', async () => {
  const worker = createWorker({ askHandler: assert.fail })
  const { env } = makeEnv()

  const response = await worker.fetch(new Request('https://example.com/api/ask'), env)

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: 'Not found' })
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('unknown /api/* returns JSON 404 with no-store', async () => {
  const worker = createWorker({ askHandler: assert.fail })
  const { env } = makeEnv()

  const response = await worker.fetch(new Request('https://example.com/api/missing'), env)

  assert.equal(response.status, 404)
  assert.match(response.headers.get('content-type'), /^application\/json\b/)
  assert.deepEqual(await response.json(), { error: 'Not found' })
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('Personal OS public and admin API paths route to their dedicated handlers', async () => {
  const calls = []
  const worker = createWorker({
    askHandler: assert.fail,
    personalOsPublicHandler(request) {
      calls.push(['public', request.method])
      return Response.json({ revision: 1 })
    },
    personalOsAdminHandler(request) {
      calls.push(['admin', request.method])
      return Response.json({ versions: [] })
    },
  })
  const env = { ASSETS: { fetch: assert.fail } }

  const publicResponse = await worker.fetch(new Request('https://example.com/api/personal-os/config'), env)
  const adminResponse = await worker.fetch(new Request('https://example.com/api/admin/personal-os/config'), env)

  assert.equal((await publicResponse.json()).revision, 1)
  assert.deepEqual(await adminResponse.json(), { versions: [] })
  assert.equal(adminResponse.headers.get('cache-control'), 'no-store')
  assert.deepEqual(calls, [['public', 'GET'], ['admin', 'GET']])
})

test('home public and admin API paths route to their dedicated handlers', async () => {
  const calls = []
  const worker = createWorker({
    askHandler: assert.fail,
    homePublicHandler(request) {
      calls.push(['public', request.method])
      return Response.json({ revision: 2 })
    },
    homeAdminHandler(request) {
      calls.push(['admin', request.method])
      return Response.json({ versions: [] })
    },
  })
  const env = { ASSETS: { fetch: assert.fail } }

  const publicResponse = await worker.fetch(new Request('https://example.com/api/home/config'), env)
  const adminResponse = await worker.fetch(new Request('https://example.com/api/admin/home/config'), env)

  assert.equal((await publicResponse.json()).revision, 2)
  assert.deepEqual(await adminResponse.json(), { versions: [] })
  assert.equal(adminResponse.headers.get('cache-control'), 'no-store')
  assert.deepEqual(calls, [['public', 'GET'], ['admin', 'GET']])
})

test('all non-API paths are delegated to env.ASSETS.fetch', async () => {
  const assetResponse = new Response('from assets', { status: 203 })
  const worker = createWorker({ askHandler: assert.fail })
  const { env, calls } = makeEnv(assetResponse)
  const requests = [
    new Request('https://example.com/'),
    new Request('https://example.com/guide', { method: 'POST' }),
  ]

  for (const request of requests) {
    const response = await worker.fetch(request, env)
    assert.equal(response, assetResponse)
  }

  assert.deepEqual(calls, requests)
})

test('default worker routes POST /api/ask to the production handler', async () => {
  const response = await worker.fetch(
    new Request('https://example.com/api/ask', { method: 'POST' }),
    { ASSETS: { fetch: assert.fail } },
  )

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: 'SERVER_MISCONFIGURED' })
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('default worker fails closed when the Personal OS database binding is absent', async () => {
  const response = await worker.fetch(
    new Request('https://example.com/api/personal-os/config'),
    { ASSETS: { fetch: assert.fail } },
  )

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: 'PERSONAL_OS_CONFIG_UNAVAILABLE' })
})

test('default worker fails closed when the home database binding is absent', async () => {
  const response = await worker.fetch(
    new Request('https://example.com/api/home/config'),
    { ASSETS: { fetch: assert.fail } },
  )

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: 'HOME_CONFIG_UNAVAILABLE' })
})
