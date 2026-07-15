import assert from 'node:assert/strict'
import test from 'node:test'

import { canvasCards, canvasConnections } from '../docs/.vitepress/theme/components/personalOsContent.mjs'
import {
  createPersonalOsAdminHandler,
  handlePublicPersonalOsConfig,
} from './personal-os-config.mjs'

const baseConfig = { cards: canvasCards, connections: canvasConnections }

function row(revision = 1, publishedAt = '2026-07-15T00:00:00.000Z') {
  return {
    revision,
    schema_version: 1,
    config_json: JSON.stringify(baseConfig),
    note: 'Initial',
    created_by: 'owner@example.com',
    created_at: '2026-07-15T00:00:00.000Z',
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
    headers: body ? {
      'content-type': 'application/json',
      origin: 'https://juzxailab.com',
    } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

const allowOwner = async () => ({ ok: true, identity: 'owner@example.com' })

test('public Personal OS config returns a validated published version and supports ETag', async () => {
  const env = { PERSONAL_OS_DB: { prepare: () => statement({ first: () => row() }) } }
  const response = await handlePublicPersonalOsConfig(request('/api/personal-os/config'), env)
  const notModified = await handlePublicPersonalOsConfig(new Request(
    'https://juzxailab.com/api/personal-os/config',
    { headers: { 'if-none-match': '"personal-os-1"' } },
  ), env)

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('etag'), '"personal-os-1"')
  assert.match(response.headers.get('cache-control'), /stale-while-revalidate=300/)
  assert.deepEqual((await response.json()).config.connections, canvasConnections)
  assert.equal(notModified.status, 304)
})

test('public Personal OS config fails closed when D1 has no published version', async () => {
  const env = { PERSONAL_OS_DB: { prepare: () => statement({}) } }
  const response = await handlePublicPersonalOsConfig(request('/api/personal-os/config'), env)

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: 'PERSONAL_OS_CONFIG_UNAVAILABLE' })
})

test('admin list returns normalized version records only after authentication', async () => {
  const denied = createPersonalOsAdminHandler({
    authenticate: async () => ({ ok: false, response: Response.json({ error: 'denied' }, { status: 403 }) }),
  })
  const allowed = createPersonalOsAdminHandler({ authenticate: allowOwner })
  const env = { PERSONAL_OS_DB: { prepare: () => statement({ all: () => ({ results: [row()] }) }) } }

  assert.equal((await denied(request('/api/admin/personal-os/config'), env)).status, 403)
  const response = await allowed(request('/api/admin/personal-os/config'), env)
  const payload = await response.json()
  assert.equal(payload.versions[0].revision, 1)
  assert.equal(payload.versions[0].config.cards.length, canvasCards.length)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('admin saves a validated draft with optimistic concurrency', async () => {
  const calls = []
  const handler = createPersonalOsAdminHandler({ authenticate: allowOwner })
  const env = {
    ALLOWED_ORIGIN: 'https://juzxailab.com',
    PERSONAL_OS_DB: {
      prepare() {
        return statement({
          run(values) {
            calls.push(values)
            return { meta: { changes: 1, last_row_id: 2 } }
          },
        })
      },
    },
  }
  const response = await handler(request('/api/admin/personal-os/config', {
    method: 'PUT',
    body: { schemaVersion: 1, baseRevision: 1, note: 'Update', config: baseConfig },
  }), env)

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { revision: 2 })
  assert.equal(calls[0][4], 1)
  assert.equal(JSON.parse(calls[0][1]).cards.length, canvasCards.length)
})

test('admin rejects stale drafts, invalid origins and unsafe links', async () => {
  const handler = createPersonalOsAdminHandler({ authenticate: allowOwner })
  const env = {
    ALLOWED_ORIGIN: 'https://juzxailab.com',
    PERSONAL_OS_DB: {
      prepare: () => statement({ run: () => ({ meta: { changes: 0 } }) }),
    },
  }
  const stale = await handler(request('/api/admin/personal-os/config', {
    method: 'PUT',
    body: { schemaVersion: 1, baseRevision: 1, config: baseConfig },
  }), env)
  const wrongOrigin = await handler(new Request('https://juzxailab.com/api/admin/personal-os/config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ schemaVersion: 1, baseRevision: 1, config: baseConfig }),
  }), env)
  const unsafeConfig = structuredClone(baseConfig)
  unsafeConfig.cards.find(({ id }) => id === 'knowledge-products').links[0].href = 'javascript:alert(1)'
  const unsafe = await handler(request('/api/admin/personal-os/config', {
    method: 'PUT',
    body: { schemaVersion: 1, baseRevision: 1, config: unsafeConfig },
  }), env)

  assert.equal(stale.status, 409)
  assert.equal(wrongOrigin.status, 403)
  assert.equal(unsafe.status, 400)
  assert.equal((await unsafe.json()).error, 'INVALID_CONFIG')
})

test('admin publishes the latest draft and creates a new revision for rollback', async () => {
  const handler = createPersonalOsAdminHandler({ authenticate: allowOwner })
  const env = {
    ALLOWED_ORIGIN: 'https://juzxailab.com',
    PERSONAL_OS_DB: {
      prepare(sql) {
        if (sql.includes('RETURNING revision')) return statement({ first: () => ({ revision: 5 }) })
        return statement({ run: () => ({ meta: { changes: 1 } }) })
      },
    },
  }
  const publish = await handler(request('/api/admin/personal-os/publish', {
    method: 'POST', body: { revision: 4 },
  }), env)
  const rollback = await handler(request('/api/admin/personal-os/rollback', {
    method: 'POST', body: { revision: 2 },
  }), env)

  assert.deepEqual(await publish.json(), { revision: 4, published: true })
  assert.equal(rollback.status, 201)
  assert.deepEqual(await rollback.json(), { revision: 5, rolledBackFrom: 2, published: true })
})
