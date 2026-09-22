import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Miniflare } from 'miniflare'

const source = await readFile(new URL('./knowledge-library.mjs', import.meta.url), 'utf8')
const config = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8')
const compatibilityDate = config.match(/"compatibility_date"\s*:\s*"([^"]+)"/)[1]
const upstreamURL = 'https://knowledge.juzxailab.com/docs/directory.json'
const manifest = {
  schemaVersion: 1,
  sha: 'b'.repeat(40),
  generatedAt: '2026-09-15T12:30:00.000Z',
  truncated: false,
  tree: [{ path: 'docs/Agent/中文 #1.html', type: 'blob', mode: '100644' }],
}

function runtime(t, outboundService) {
  const mf = new Miniflare({
    compatibilityDate,
    modules: true,
    // Execute the production handler and real workerd fetch construction; only the outbound server is mocked.
    script: `${source}\nexport default { fetch: handleKnowledgeTree }`,
    outboundService,
  })
  t.after(() => mf.dispose())
  return mf
}

function publicHeaders(response) {
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('access-control-allow-origin'), '*')
}

test('workerd fetch options and UTF-8 parsing serve a valid published manifest', async (t) => {
  const requests = []
  const mf = runtime(t, (request) => {
    requests.push(request.url)
    return Response.json(manifest, { headers: { 'content-type': 'application/json; charset=utf-8' } })
  })
  const response = await mf.dispatchFetch('https://example.com/api/knowledge/tree?refresh=1')
  assert.equal(response.status, 200)
  publicHeaders(response)
  assert.deepEqual(await response.json(), { ...manifest, source: 'live' })
  assert.deepEqual(requests, [upstreamURL])
})

test('workerd refuses upstream redirects without following their location', async (t) => {
  const requests = []
  const mf = runtime(t, (request) => {
    requests.push(request.url)
    if (request.url === upstreamURL) {
      return new Response(null, { status: 302, headers: { location: 'https://redirect.example/directory.json' } })
    }
    return Response.json(manifest)
  })
  const response = await mf.dispatchFetch('https://example.com/api/knowledge/tree?refresh=1')
  assert.equal(response.status, 503)
  publicHeaders(response)
  assert.deepEqual(await response.json(), { error: 'KNOWLEDGE_DIRECTORY_UNAVAILABLE' })
  assert.deepEqual(requests, [upstreamURL])
})
