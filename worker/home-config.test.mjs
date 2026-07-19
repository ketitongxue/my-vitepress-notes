import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_HOME_CONFIG } from '../shared/home-config.mjs'
import { createHomeAdminHandler, handlePublicHomeConfig } from './home-config.mjs'

function row(revision = 1, publishedAt = '2026-07-16T00:00:00.000Z') {
  return {
    revision,
    schema_version: 1,
    config_json: JSON.stringify(DEFAULT_HOME_CONFIG),
    note: 'Initial',
    created_by: 'owner@example.com',
    created_at: '2026-07-16T00:00:00.000Z',
    published_at: publishedAt,
  }
}

function statement(methods) {
  return {
    values: [],
    bind(...values) { this.values = values; return this },
    async first() { return methods.first?.(this.values) ?? null },
    async all() { return methods.all?.(this.values) ?? { results: [] } },
    async run() { return methods.run?.(this.values) ?? { meta: { changes: 0 } } },
  }
}

function request(path, { method = 'GET', body } = {}) {
  return new Request(`https://juzxailab.com${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json', origin: 'https://juzxailab.com' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

const allowOwner = async () => ({ ok: true, identity: 'owner@example.com' })

test('public home config returns the latest validated version with ETag', async () => {
  const env = { PERSONAL_OS_DB: { prepare: () => statement({ first: () => row() }) } }
  const response = await handlePublicHomeConfig(request('/api/home/config'), env)
  const notModified = await handlePublicHomeConfig(new Request(
    'https://juzxailab.com/api/home/config',
    { headers: { 'if-none-match': '"home-1"' } },
  ), env)

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('etag'), '"home-1"')
  assert.match(response.headers.get('cache-control'), /stale-while-revalidate=300/)
  assert.equal((await response.json()).config.desktop.entries.length, 9)
  assert.equal(notModified.status, 304)
})

test('public home config fails closed when D1 has no published version', async () => {
  const env = { PERSONAL_OS_DB: { prepare: () => statement({}) } }
  const response = await handlePublicHomeConfig(request('/api/home/config'), env)

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: 'HOME_CONFIG_UNAVAILABLE' })
})

test('home admin requires authentication and lists normalized versions', async () => {
  const denied = createHomeAdminHandler({
    authenticate: async () => ({ ok: false, response: Response.json({ error: 'denied' }, { status: 403 }) }),
  })
  const allowed = createHomeAdminHandler({ authenticate: allowOwner })
  const env = { PERSONAL_OS_DB: { prepare: () => statement({ all: () => ({ results: [row()] }) }) } }

  assert.equal((await denied(request('/api/admin/home/config'), env)).status, 403)
  const response = await allowed(request('/api/admin/home/config'), env)
  assert.equal((await response.json()).versions[0].config.desktop.entries[0].id, 'llm-wiki')
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('home admin saves a validated draft with optimistic concurrency', async () => {
  const calls = []
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  const env = {
    ALLOWED_ORIGIN: 'https://juzxailab.com',
    PERSONAL_OS_DB: {
      prepare: () => statement({
        run(values) {
          calls.push(values)
          return { meta: { changes: 1, last_row_id: 2 } }
        },
      }),
    },
  }
  const response = await handler(request('/api/admin/home/config', {
    method: 'PUT',
    body: { schemaVersion: 1, baseRevision: 1, note: 'Update', config: DEFAULT_HOME_CONFIG },
  }), env)

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { revision: 2 })
  assert.equal(calls[0][4], 1)
  assert.equal(JSON.parse(calls[0][1]).desktop.entries.length, 9)
})

test('home admin rejects stale drafts, invalid origins, duplicate ids, and unsafe links', async () => {
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  const env = {
    ALLOWED_ORIGIN: 'https://juzxailab.com',
    PERSONAL_OS_DB: { prepare: () => statement({ run: () => ({ meta: { changes: 0 } }) }) },
  }
  const stale = await handler(request('/api/admin/home/config', {
    method: 'PUT', body: { schemaVersion: 1, baseRevision: 1, config: DEFAULT_HOME_CONFIG },
  }), env)
  const wrongOrigin = await handler(new Request('https://juzxailab.com/api/admin/home/config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ schemaVersion: 1, baseRevision: 1, config: DEFAULT_HOME_CONFIG }),
  }), env)
  const unsafeConfig = structuredClone(DEFAULT_HOME_CONFIG)
  unsafeConfig.desktop.entries[0].window.href = 'javascript:alert(1)'
  const unsafe = await handler(request('/api/admin/home/config', {
    method: 'PUT', body: { schemaVersion: 1, baseRevision: 1, config: unsafeConfig },
  }), env)
  const duplicateConfig = structuredClone(DEFAULT_HOME_CONFIG)
  duplicateConfig.desktop.entries[1].id = duplicateConfig.desktop.entries[0].id
  const duplicate = await handler(request('/api/admin/home/config', {
    method: 'PUT', body: { schemaVersion: 1, baseRevision: 1, config: duplicateConfig },
  }), env)

  assert.equal(stale.status, 409)
  assert.equal(wrongOrigin.status, 403)
  assert.equal(unsafe.status, 400)
  assert.equal(duplicate.status, 400)
})

test('home admin publishes latest and rollback creates a new published revision', async () => {
  const handler = createHomeAdminHandler({ authenticate: allowOwner })
  const env = {
    ALLOWED_ORIGIN: 'https://juzxailab.com',
    PERSONAL_OS_DB: {
      prepare(sql) {
        if (sql.includes('RETURNING revision')) return statement({ first: () => ({ revision: 5 }) })
        return statement({ run: () => ({ meta: { changes: 1 } }) })
      },
    },
  }
  const publish = await handler(request('/api/admin/home/publish', {
    method: 'POST', body: { revision: 4 },
  }), env)
  const rollback = await handler(request('/api/admin/home/rollback', {
    method: 'POST', body: { revision: 2 },
  }), env)

  assert.deepEqual(await publish.json(), { revision: 4, published: true })
  assert.equal(rollback.status, 201)
  assert.deepEqual(await rollback.json(), { revision: 5, rolledBackFrom: 2, published: true })
})
